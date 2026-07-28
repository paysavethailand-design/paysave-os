# RFC-0003 — Stage 3.2 Cryptography Decision Packet

- **Status:** OPEN — BLOCKS sensitive-column DDL
- **Logical impact:** None

## Conflict

Engineering Blueprint v1.0 §8.1 states that no sensitive-column DDL may be accepted until owner-approved references exist for all of the following. The repository contains the requirement but no approved decision references.

## Decisions required

1. KMS/provider and environment-separated key hierarchy
2. Authenticated cipher and ciphertext-envelope version, nonce and associated-data rules
3. Keyed lookup digest/HMAC profile and collision handling
4. Rotation, dual-read, re-encryption and key-retirement procedure
5. Emergency revocation/break-glass decrypt approver and immutable audit path
6. Backup/archive key availability and rotated-key restore evidence

## Affected physical contracts

The approved schema contains 13 ciphertext columns and their key-version companions, plus E03/E04/E05 object, payload and integration controls. DDL can validate envelope presence and key-version consistency, but it cannot select or invent the missing provider/security contracts.

## Required approval

Security Architecture, Principal Database Engineer, Security Operations, Privacy and Records owners must attach decision references before M001–M018 sensitive-column DDL is generated.
