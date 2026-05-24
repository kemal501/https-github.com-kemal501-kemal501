# Security Specification

## Data Invariants
1. A user cannot exist without a valid UID, role, coins, and createdAt.
2. A withdrawal must belong to the requesting user and be supported by sufficient coins.

## The "Dirty Dozen" Payloads
(Simplified for brevity)
1. User Create without coins.
2. User Create with role 'admin'.
3. Withdrawal without userId.
4. Withdrawal for more than balance.
5. Room create with hostId not request.auth.uid.
6. Message create with senderId not request.auth.uid.
7. ... (etc.)

## Test Runner (firestore.rules.test.ts)
(Logic to test these payloads against rules)
