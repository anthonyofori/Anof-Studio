# Anof Studio Security Specification

## 1. Data Invariants
1. **User Identity Isolation**: A user can only access, create, read, update, or delete their own documents rooted at `/users/{userId}/**`. Cross-user data access is completely rejected.
2. **Owner Verification**: Every document written must have `incoming().userId == request.auth.uid`.
3. **No Unauthenticated Access**: Unauthenticated requests (`request.auth == null`) are denied by default across all documents.
4. **Valid Path Keys**: Path variables like `userId`, `scriptId`, `cloneId`, and `generationId` must be valid alphanumeric strings $\le 128$ characters.
5. **No Ghost Fields (Strict Schema Keys)**: Payloads must adhere to allowed fields; unexpected/malicious keys are rejected.
6. **Immutable User ID**: Once created, `userId` cannot be modified during updates.

## 2. The Dirty Dozen Payloads (Rejection Targets)
1. **Spoofed User ID on UserProfile**: Setting `userId` to another user's UID.
2. **Unauthenticated UserProfile Write**: Attempting to create a profile without authentication.
3. **Ghost Field on Script**: Adding `__isAdmin: true` or unapproved fields.
4. **Script ID Poisoning**: Using a 10KB string as a `scriptId`.
5. **Impersonated Script Author**: Creating a script under `/users/{userId}/scripts/{scriptId}` with `userId` of a victim.
6. **Cross-User Script Read**: Attempting to read `/users/userA/scripts/s1` when authenticated as `userB`.
7. **Oversized Script Payload**: Script content exceeding 10,000 characters.
8. **Invalid Voice Clone Gender**: Setting gender to arbitrary string instead of 'male' | 'female'.
9. **Oversized Voice Clone Timbre**: Timbre description exceeding 300 characters.
10. **Immutable Field Mutated**: Updating a script with a modified `userId`.
11. **Spoofed Speech Generation User**: Adding a generation record with mismatched `userId`.
12. **Blanket Query Scraping**: Attempting a collectionGroup query across all users' scripts.
