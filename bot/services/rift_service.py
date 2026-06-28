from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import distinct, select

from backend.database import async_session
from backend.models.creature import Creature
from backend.models.group import Group
from backend.models.rift import Rift
from backend.models.rift_action import RiftAction
from backend.models.user import User
from bot.services.creature_service import seed_oni_404


RIFT_DURATION_MINUTES = 10


def _now():
    return datetime.now(timezone.utc)


def _level_from_xp(xp: int) -> int:
    return max(1, xp // 100 + 1)


async def _get_district_name(session, telegram_chat_id: int, group_id: int | None) -> str:
    if group_id:
        group = await session.get(Group, group_id)
        if group:
            return group.district_name
    return "Solo Rift"


async def open_rift(
    telegram_chat_id: int,
    group_id: int | None,
):
    creature = await seed_oni_404()

    async with async_session() as session:
        active_result = await session.execute(
            select(Rift)
            .where(Rift.telegram_chat_id == telegram_chat_id)
            .where(Rift.status == "active")
        )
        active_rift = active_result.scalar_one_or_none()

        district_name = await _get_district_name(session, telegram_chat_id, group_id)

        if active_rift:
            active_creature = await session.get(Creature, active_rift.creature_id)
            return active_rift, active_creature, district_name, False

        rift = Rift(
            telegram_chat_id=telegram_chat_id,
            group_id=group_id,
            creature_id=creature.id,
            hp=creature.max_hp,
            max_hp=creature.max_hp,
            status="active",
            opened_at=_now(),
            expires_at=_now() + timedelta(minutes=RIFT_DURATION_MINUTES),
        )
        session.add(rift)
        await session.commit()
        await session.refresh(rift)

        creature_in_session = await session.get(Creature, creature.id)
        return rift, creature_in_session, district_name, True


async def set_rift_message_id(rift_id: int, message_id: int) -> None:
    async with async_session() as session:
        rift = await session.get(Rift, rift_id)
        if not rift:
            return
        rift.message_id = message_id
        await session.commit()


def _action_roll(action_type: str) -> tuple[int, str]:
    if action_type == "attack":
        return random.randint(14, 24), "⚔️"
    if action_type == "seal":
        return random.randint(9, 17), "🔮"
    if action_type == "summon":
        return random.randint(6, 12), "⚫"
    return 0, "❔"


def _action_name(action_type: str) -> str:
    if action_type == "attack":
        return "атаковал"
    if action_type == "seal":
        return "попытался запечатать"
    if action_type == "summon":
        return "призвал Сумибито"
    return "действует"


async def process_rift_action(
    rift_id: int,
    user_id: int,
    user_name: str,
    action_type: str,
) -> dict:
    if action_type not in {"attack", "seal", "summon"}:
        return {"error": "Неизвестное действие."}

    async with async_session() as session:
        rift = await session.get(Rift, rift_id)
        if not rift:
            return {"error": "Разлом не найден."}

        if rift.status != "active":
            return {"error": "Этот разлом уже закрыт."}

        creature = await session.get(Creature, rift.creature_id)
        if not creature:
            return {"error": "Существо разлома не найдено."}

        if rift.expires_at and rift.expires_at < _now():
            rift.status = "failed"
            await session.commit()
            return {"error": "Разлом уже исчез."}

        value, icon = _action_roll(action_type)
        rift.hp = max(0, rift.hp - value)

        action = RiftAction(
            rift_id=rift.id,
            user_id=user_id,
            action_type=action_type,
            value=value,
        )
        session.add(action)

        event_text = f"{icon} <b>{user_name}</b> {_action_name(action_type)} {creature.name}: -{value} HP"
        short_event = f"-{value} HP"

        closed = False
        reward_lines: list[str] = []

        if rift.hp <= 0:
            closed = True
            rift.status = "closed"
            rift.closed_at = _now()
            rift.closed_by_user_id = user_id

            participants_result = await session.execute(
                select(distinct(RiftAction.user_id)).where(RiftAction.rift_id == rift.id)
            )
            participant_ids = [row[0] for row in participants_result.all()]
            if user_id not in participant_ids:
                participant_ids.append(user_id)

            for participant_id in participant_ids:
                participant = await session.get(User, participant_id)
                if participant:
                    participant.xp += creature.xp_reward
                    participant.level = _level_from_xp(participant.xp)
                    participant.rifts_closed += 1

            reward_lines = [
                f"+{creature.xp_reward} XP каждому участнику",
                "+1 закрытый разлом",
                f"Шанс добавить {creature.name} в архив: {creature.catch_chance}%",
            ]

        await session.commit()
        await session.refresh(rift)
        await session.refresh(creature)

        district_name = await _get_district_name(session, rift.telegram_chat_id, rift.group_id)

        return {
            "error": None,
            "closed": closed,
            "short_event": short_event,
            "event_text": event_text,
            "reward_lines": reward_lines,
            "district_name": district_name,
            "rift": {
                "id": rift.id,
                "hp": rift.hp,
                "max_hp": rift.max_hp,
                "status": rift.status,
            },
            "creature": {
                "name": creature.name,
                "creature_type": creature.creature_type,
                "rarity": creature.rarity,
                "description": creature.description,
                "xp_reward": creature.xp_reward,
                "catch_chance": creature.catch_chance,
            },
        }


def build_rift_caption(
    rift,
    creature,
    district_name: str,
    last_event: str | None = None,
) -> str:
    rift_id = rift["id"] if isinstance(rift, dict) else rift.id
    hp = rift["hp"] if isinstance(rift, dict) else rift.hp
    max_hp = rift["max_hp"] if isinstance(rift, dict) else rift.max_hp

    name = creature["name"] if isinstance(creature, dict) else creature.name
    rarity = creature["rarity"] if isinstance(creature, dict) else creature.rarity
    creature_type = creature["creature_type"] if isinstance(creature, dict) else creature.creature_type
    description = creature["description"] if isinstance(creature, dict) else creature.description

    hp_bar = _make_hp_bar(hp, max_hp)

    text = (
        "⚠️ <b>Разлом открыт</b>\n\n"
        f"<b>Район:</b> {district_name}\n"
        f"<b>Сущность:</b> {name}\n"
        f"<b>Тип:</b> {creature_type}\n"
        f"<b>Редкость:</b> {rarity}\n"
        f"<b>HP:</b> {hp} / {max_hp}\n"
        f"{hp_bar}\n\n"
        f"<i>{description}</i>\n\n"
    )

    if last_event:
        text += f"{last_event}\n\n"

    text += f"ID разлома: <code>{rift_id}</code>"
    return text


def build_closed_rift_caption(result: dict) -> str:
    creature = result["creature"]
    rift = result["rift"]
    hp_bar = _make_hp_bar(0, rift["max_hp"])

    rewards = "\n".join(f"• {line}" for line in result["reward_lines"])

    return (
        "✅ <b>Разлом закрыт</b>\n\n"
        f"<b>{creature['name']}</b> распался в фиолетовый глитч и духовный дым.\n"
        f"<b>HP:</b> 0 / {rift['max_hp']}\n"
        f"{hp_bar}\n\n"
        f"{result['event_text']}\n\n"
        "<b>Награда:</b>\n"
        f"{rewards}"
    )


def _make_hp_bar(hp: int, max_hp: int) -> str:
    total = 10
    filled = round((hp / max_hp) * total) if max_hp else 0
    filled = max(0, min(total, filled))
    empty = total - filled
    return "🟥" * filled + "⬛" * empty
