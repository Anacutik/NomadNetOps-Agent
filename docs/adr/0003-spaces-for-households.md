# 0003 Data lives in private and shared spaces

**Status:** Accepted

**Context:** Households share some things (agenda, bills) and keep others private.

**Decision:** Every record and event has a `space_id`. Each space has its own Data Key wrapped per member device. Roles: owner, member, viewer. Removing a member rotates the key. Private spaces are invisible to others. Tier 3 approvals need a human with their own 2FA.

**Consequences:** Schema, sync and policy checks are space-aware from the first commit. Details: docs/TECHNICAL-DESIGN.md section 15.1.
