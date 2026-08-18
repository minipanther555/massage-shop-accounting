# Operator-reported batch — 2026-08-18

**This is INPUT, not a spec.** It is the raw list of what the operator reported, in their own words,
plus the answers they gave when questioned. Nothing here is designed, decided, or decomposed.

**It has never been through a protocol.** The correct next move is `/spec-creation-new-feature`
(or `/planning-map-creation` first, if the one-session test says the deciding spans more than one
sitting — that test has not been run). A previous session skipped straight to writing three feature
specs from this material without running either protocol; those specs are untrustworthy and are being
rebuilt.

**Why this file exists:** the operator asked for "a revision spec" listing everything to be fixed.
One was never created. This is that list, recovered verbatim so it stops depending on chat scrollback.

---

## 1. What the operator actually asked for

Four items, given at the start of the session as a batch. **Two are bugs, two are feature requests.**
The operator's exact framing is preserved here because the previous session paraphrased it and got
the routing wrong.

**BUG 1 — state does not refresh after submit.** Operator: *"we go to new customer, input a massage,
click submit, and the massage gets submitted, but then everything needs to be refreshed so that the
next masseuse is moved to top of queue and everything is auto moved to the current state of the db
(dropdowns, queue state, whos working etc, needs to be updated on submit) currently it seems like it
needs to be refreshed by hand."*

**BUG 2 — overnight staleness.** Operator: *"same thing for overnight, seems like the yesterdays
roster just keeps appearing even though its the next day, like there was no auto refresh overnight or
auto refresh on submit etc."*

**BUG 3 — edited transaction leaves the masseuse at the top of the queue.** Operator: *"today แนนนี่
was submitted as 1h thai massage, then it was edited to a 2h thai massage, and then she is still
showing as first on the queue. this one doesnt seem to be a refresh issue, it simply is some wrong
logic somewhere."* Three rows appeared for one customer: `฿399`, `฿798 (EDITED)`, `฿399 (EDITED)`.

**FEATURE 1 — non-cash tips.** Operator: *"we need to add functionality for when the customer tips
via their payment method instead of cash, the shop accepts for example credit card or gowabi payment
and then pays the masseuse in cash."* Later corrected by the operator — see §2.

**FEATURE 2 — miscellaneous income.** Operator: *"a corollary is just that there should be a way to
add miscellaneous income."*

---

## 2. Operator answers given in conversation — INTERVIEW CONTENT, NOT RECORDED ANYWHERE ELSE

These were given verbally in the session and exist nowhere on disk. **They are ratified interview
answers. Do not re-litigate them; do confirm you have understood them.**

**On tips — the model, corrected by the operator after the previous session got it wrong:**
> *"the tips get handed to the masseuses immediately they dont get added to their payday balance,
> unlike their commission for the massage itself."*
> *"the massage costs whatever amount. It's 700, and then there's an additional 100 baht tip, so then
> it's like 800 in income. It's 700 from the massage plus an additional 100 miscellaneous income."*
> *"there's a section for expenses... you would just basically have an additional 100 baht income,
> and that gets added in the payment section... Just an additional 100 baht gets added in the
> expenses section as well. And then presumably you should track who it was that got the tip."*
> *"It's a net neutral book, but we are able to track what happened because it comes in as cash into
> the bank account and then it goes out as cash."*

**On extra charges (a distinct case from tips):**
> *"sometimes a customer might add an additional expense, like they get a normal massage and then
> they ask for tiger bomb, so then they get charged 50 baht extra. That would be like an additional
> 50 baht income."*

**On till tracking — explicitly OUT of scope:**
> *"I asked the manager, and they don't really want to track that as much, but they do want to track
> it as income and expenses."*

**On point-of-sale integration — explicitly speculative, OUT of scope:**
> *"There's some possibility that we could connect... we get some emails and text messages... so we
> could hypothetically connect to POS with that."*

**On WHY the edit audit trail exists — this is the most important context in this file:**
> *"the point of the edited transaction is because like previously, the receptionist stole money so
> that's the whole issue... we're tracking the payments with a book and pen and paper and so when
> there's a mistake made it's supposed to have both transactions in the ledger so you can see what
> the receptionist did."*

**On what an edit IS, and what must be editable:**
> *"it's normally a mistake. It's normally the same masseuse, but the reception can pick whichever
> one. It might be that she misclicks and puts a 1-hour massage when it should be a 2-hour massage...
> It might be that a certain masseuse doesn't want to do a certain type of massage that day, or that
> a certain masseuse is on break... She clicks submit and has to undo and therefore change the
> masseuse. The point is, there's some sort of mistake. It needs to be undone. That means **every
> field needs to be editable**, and then you can see what the previous transaction was and why it was
> wrong."*

**The operator's own statement of the desired edit behaviour, end to end:**
> *"1. We put a masseuse. Her name is masseuse one. 2. We edit the transaction. 3. We make her still
> top of the queue, obviously, because she gets cancelled because the transaction is being cancelled.
> 4. We put the new correct transaction. 5. She's taken. She should now be mid-massage."*

**On the database — this invalidates any "urgent data loss" framing:**
> *"all the data in the database is fake right now. We're still testing this shit."*

**On priority:**
> *"the priority is fixing the edit transaction situation so that it edits correctly. If it edits
> correctly, maybe that fixes the manager staff dashboard as well... If the edit transaction thing is
> broken to begin with, obviously everything downstream of that is going to be broken."*

**On the daily-summary / monthly-report divergence the previous session raised:**
> *"it's kind of like orthogonal issues. Can we get the first thing working? ... That was not part of
> the specs that we made."* — treat as OUT of scope.

---

## 2. Operator answers given in conversation — INTERVIEW CONTENT, NOT RECORDED ANYWHERE ELSE

These were given verbally in the session and exist nowhere on disk. **They are ratified interview
answers. Do not re-litigate them; do confirm you have understood them.**

**On tips — the model, corrected by the operator after the previous session got it wrong:**
> *"the tips get handed to the masseuses immediately they dont get added to their payday balance,
> unlike their commission for the massage itself."*
> *"the massage costs whatever amount. It's 700, and then there's an additional 100 baht tip, so then
> it's like 800 in income. It's 700 from the massage plus an additional 100 miscellaneous income."*
> *"there's a section for expenses... you would just basically have an additional 100 baht income,
> and that gets added in the payment section... Just an additional 100 baht gets added in the
> expenses section as well. And then presumably you should track who it was that got the tip."*
> *"It's a net neutral book, but we are able to track what happened because it comes in as cash into
> the bank account and then it goes out as cash."*

**On extra charges (a distinct case from tips):**
> *"sometimes a customer might add an additional expense, like they get a normal massage and then
> they ask for tiger bomb, so then they get charged 50 baht extra. That would be like an additional
> 50 baht income."*

**On till tracking — explicitly OUT of scope:**
> *"I asked the manager, and they don't really want to track that as much, but they do want to track
> it as income and expenses."*

**On point-of-sale integration — explicitly speculative, OUT of scope:**
> *"There's some possibility that we could connect... we get some emails and text messages... so we
> could hypothetically connect to POS with that."*

**On WHY the edit audit trail exists — this is the most important context in this file:**
> *"the point of the edited transaction is because like previously, the receptionist stole money so
> that's the whole issue... we're tracking the payments with a book and pen and paper and so when
> there's a mistake made it's supposed to have both transactions in the ledger so you can see what
> the receptionist did."*

**On what an edit IS, and what must be editable:**
> *"it's normally a mistake. It's normally the same masseuse, but the reception can pick whichever
> one. It might be that she misclicks and puts a 1-hour massage when it should be a 2-hour massage...
> It might be that a certain masseuse doesn't want to do a certain type of massage that day, or that
> a certain masseuse is on break... She clicks submit and has to undo and therefore change the
> masseuse. The point is, there's some sort of mistake. It needs to be undone. That means **every
> field needs to be editable**, and then you can see what the previous transaction was and why it was
> wrong."*

**The operator's own statement of the desired edit behaviour, end to end:**
> *"1. We put a masseuse. Her name is masseuse one. 2. We edit the transaction. 3. We make her still
> top of the queue, obviously, because she gets cancelled because the transaction is being cancelled.
> 4. We put the new correct transaction. 5. She's taken. She should now be mid-massage."*

**On the database — this invalidates any "urgent data loss" framing:**
> *"all the data in the database is fake right now. We're still testing this shit."*

**On priority:**
> *"the priority is fixing the edit transaction situation so that it edits correctly. If it edits
> correctly, maybe that fixes the manager staff dashboard as well... If the edit transaction thing is
> broken to begin with, obviously everything downstream of that is going to be broken."*

**On the daily-summary / monthly-report divergence the previous session raised:**
> *"it's kind of like orthogonal issues. Can we get the first thing working? ... That was not part of
> the specs that we made."* — treat as OUT of scope.

---

