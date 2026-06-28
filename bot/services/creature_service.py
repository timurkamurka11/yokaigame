from sqlalchemy import select

from backend.database import async_session
from backend.models.creature import Creature


ONI_404_DATA = {
    "name": "Oni-404",
    "slug": "oni_404",
    "creature_type": "Oni / Cyber / Spirit",
    "rarity": "Rare",
    "description": (
        "Демоническая цифровая аномалия, рождённая сетевым сбоем. "
        "Oni-404 существует на стыке духовного мира и ошибки кода."
    ),
    "max_hp": 120,
    "attack": 15,
    "xp_reward": 25,
    "catch_chance": 12,
    "sprite_idle": "assets/creatures/oni_404/oni_404_idle.png",
    "sprite_attack": "assets/creatures/oni_404/oni_404_attack.png",
    "sprite_death": "assets/creatures/oni_404/oni_404_death.png",
    "is_hostile": True,
    "is_helper": False,
}


async def seed_oni_404() -> Creature:
    async with async_session() as session:
        result = await session.execute(
            select(Creature).where(Creature.slug == ONI_404_DATA["slug"])
        )
        creature = result.scalar_one_or_none()

        if creature is None:
            creature = Creature(**ONI_404_DATA)
            session.add(creature)
        else:
            for key, value in ONI_404_DATA.items():
                setattr(creature, key, value)

        await session.commit()
        await session.refresh(creature)
        return creature
