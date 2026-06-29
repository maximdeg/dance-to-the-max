# Hosted video provider instead of self-hosted transcoding

Videos are stored, transcoded, and streamed through a hosted provider (Mux / Bunny Stream / Cloudflare Stream) using signed, expiring playback URLs — not the self-built transcoding queue implied by the spec. Rationale: transcoding, adaptive HLS, thumbnails, and access-controlled delivery come out of the box, cutting time-to-launch from months to weeks.

## Consequences

Per-GB cost and provider lock-in; revisit self-hosting once volume justifies it. The specific provider is still to be chosen (see the "Video provider selection" backlog issue).
