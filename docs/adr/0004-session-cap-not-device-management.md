# Concurrent-session cap instead of device management (v1)

v1 enforces a maximum of three concurrent login **Sessions** per Account (a fourth login evicts the least-recently-active Session) but does **not** build the spec's full device-management feature (named device list, "sesiones activas" panel, remote logout). The cap counts logins, not simultaneous streams. Rationale: a session cap protects most of the revenue from account-sharing at a fraction of the cost; full device management is deferred. Recorded so the missing device UI is understood as deliberate, not an oversight.
