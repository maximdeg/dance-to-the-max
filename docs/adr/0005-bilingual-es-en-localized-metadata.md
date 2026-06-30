# Bilingual ES/EN with localized content metadata (v1)

v1 ships a bilingual Spanish/English UI (with a language switcher), and **content metadata** — Dance names, Video titles and descriptions, and Tag labels — is stored **per Locale**, rather than the single-language model a lean MVP would normally assume. Video audio and subtitles are **not** localized in v1.

Rationale: the studio wants to reach Spanish- and English-speaking dancers from launch, and retrofitting localized text fields + i18n into an already-built app is costly — cheaper to bake in now.

## Consequences

- The schema carries per-Locale text fields for Dance/Video/Tag.
- The Super Admin authors titles and descriptions in **both** languages.
- Fixed **Level** values stay canonical internally ("Primeras veces" … "Max") with translated display labels.
- Video captions/subtitles remain a later content project (out of scope for v1).
