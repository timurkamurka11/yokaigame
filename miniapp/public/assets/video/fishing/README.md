# Yokai.exe fishing background videos

The fishing screen expects two MP4 files in this folder:

```text
fishing-bg-part-1.mp4
fishing-bg-part-2.mp4
```

`fishing-bg-part-1.mp4` = uploaded file `Use_the_uploaded_reference_ima(1).mp4`.

`fishing-bg-part-2.mp4` = uploaded file `Animate_this_image_as_Part_o.mp4`.

They are played sequentially by `miniapp/src/features/fishing/FishingMiniGame.tsx`:

```text
part 1 -> part 2 -> part 1 -> part 2 ...
```

The GitHub connector used for this patch cannot attach binary MP4 files directly through the text contents API, so the MP4 assets must be copied into this folder from the patch ZIP before running the Mini App.
