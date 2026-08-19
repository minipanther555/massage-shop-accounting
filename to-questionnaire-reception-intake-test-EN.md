# Reception Intake — What Changed, and How to Test It

**Purpose:** Six things were changed in the reception New Customer page and the numbers behind it. We need to know whether each one actually works during a real shift, on real hardware, with real customers. Only you can answer that — the tests we run cannot tell us whether the screen makes sense to the person using it.

**From:** the development team — **To:** the shop manager — **How your answers will be used:** anything that does not work goes back for a fix before this reaches daily use. Anything that works stays.

## Context

Five problems were reported: an edited transaction left the masseuse stuck at the top of the queue, nothing updated after pressing submit, yesterday's staff list kept appearing overnight, there was no way to record a tip paid by card, and no way to record an extra charge like tiger balm. All five have been changed. The system is now running on the test server so you can try it.

**Everything in the database is test data.** Nothing you do during this test can damage real records. Please try things properly — including things you think might break it.

## How to answer

Work one normal shift, or about an hour if that is easier. Under each question, type what actually happened. If something did not happen at all, say so — that is the most useful answer of all. "I did not try this" is fine too.

**Two things are known to be broken. Please do not test these, and tell us if you hit them by accident:**
- **The "extend massage" button.** It hides the whole form and you cannot get back. We know. It is being fixed separately.
- **The "End Day" button.** Please do not press it during this test.

---

## 1. Adding a new customer

### After you press Submit on a new customer, does the screen update by itself?

_Why this matters: before, you had to refresh the page by hand to see the next masseuse move to the top._

Look at three things straight after submitting, without refreshing: the masseuse dropdown, who is marked as next in the queue, and the day's money figure at the top.

>

### Did the masseuse you just assigned show as busy, without you doing anything else?

>

---

## 2. Correcting a mistake

This is the most important section. It is the problem you reported first.

### After you edit a transaction, does the masseuse stay marked as busy?

_Why this matters: before, editing a transaction made her look free again and pushed her back to the top of the queue, so she could be given a second customer while still working._

Book a customer with one masseuse. Then edit that transaction — change the duration, or change to a different masseuse. Then look at the staff list.

>

### Is she counted as having done exactly one massage — not zero, and not two?

>

### Is the next customer offered to somebody else, not to her?

>

### Can you still see both the original and the corrected transaction in the records?

_Why this matters: both entries must stay visible so a mistake can always be traced. This is deliberate and must not disappear._

>

---

## 3. Overnight and the 2am changeover

### The morning after, does the staff list show yesterday's names?

_Why this matters: it used to show yesterday's roster as if it were today's, so the wrong people appeared available._

If you can, leave the tablet open overnight and look at it the next morning without refreshing.

>

### When today's staff list is empty, what does the masseuse dropdown show?

_Why this matters: it should offer nobody and tell you to go set up today's staff. It should never show a list of names left over from yesterday._

>

### Between 2am and about 7am, do the money figures and the staff panel agree about which day it is?

_Why this matters: they used to disagree during those hours — the money said one day and the staff list said another._

>

---

## 4. Recording a tip paid by card

This is new. There was no way to do this before.

### Can you find where to record a tip?

_Why this matters: it is a new button in the same row as walk-in and booking, labelled ทิป/รายรับอื่น. If it is hard to find, we want to know._

>

### Record a tip: pick the customer's massage, enter the tip amount, choose the payment method the customer used.

Try a real example — a ฿700 massage with a ฿100 tip paid by card.

>

### Did the day's income go up by the tip amount?

_Why this matters: a ฿700 massage plus a ฿100 tip should show as ฿800 of income._

>

### Did a matching expense appear for the same amount, with the masseuse's name on it?

_Why this matters: the shop takes the tip by card and hands the masseuse cash, so it is income and expense both. The book should end up neutral, and you should be able to see who received it._

>

### Did the tip change her payday balance?

_Why this matters: it must NOT. You told us tips are handed over immediately and are not part of her commission. If her payday total went up, that is wrong._

>

### Did recording the tip move her position in the queue, or change her massage count?

_Why this matters: it must not. A tip is not a massage._

>

---

## 5. Recording an extra charge

### Record an extra charge — for example tiger balm at ฿50.

You should need to enter an amount and a short description of what was sold.

>

### Did the day's income go up by that amount?

>

### Did it create an expense as well?

_Why this matters: it should NOT. Unlike a tip, an extra charge is income only — the shop keeps it._

>

### Did it change anybody's queue position or massage count?

_Why this matters: it must not._

>

### Could you submit it without typing a description?

_Why this matters: it should refuse and tell you a description is needed, because that description is what appears in the records later._

>

---

## 6. When the internet or the server has a problem

### Did you ever see a warning on the staff area saying the information might be out of date?

_Why this matters: before, if the page failed to load new information it just froze quietly and looked correct. Now it should warn you. You may never see this if the connection is good — that is fine, just say so._

>

### If you did see it, did it clear by itself once things were working again?

>

---

## 7. Overall

### Was there any moment where the screen disagreed with what you knew to be true?

_Why this matters: this is the whole point of the work. Any example, even a small one, is valuable._

>

### Did you ever have to refresh the page by hand to make it show the right thing?

>

### Is there anything about the new tip and extra-charge screen that is confusing, in the wrong place, or worded badly in Thai?

_Why this matters: the wording and layout were chosen by us without asking you. Please say if any of it is wrong._

>

## Anything else?

Anything we did not ask about that we should know — anything that felt slow, wrong, surprising, or annoying?

>
