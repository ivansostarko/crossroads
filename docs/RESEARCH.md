# The research behind Crossroads

Every step in the app maps to a documented finding in decision science. This file explains each one and lists the primary references, so contributors can extend the app without diluting its evidence base.

---

## 1. Writing the situation down

Putting a problem into words reduces its emotional charge and frees working memory for actual reasoning. Pennebaker's expressive-writing studies showed measurable benefits from simply articulating stressful situations in writing; affect-labeling research (Lieberman et al., 2007) found that naming an emotion dampens amygdala response.

- Pennebaker, J. W. (1997). *Writing about emotional experiences as a therapeutic process.* Psychological Science, 8(3).
- Lieberman, M. D. et al. (2007). *Putting feelings into words.* Psychological Science, 18(5).

## 2. One-way vs. two-way doors (reversibility)

Jeff Bezos's shareholder-letter heuristic (1997/2015): most decisions are **two-way doors** — reversible, so they should be made quickly by individuals with ~70% of the information; a minority are **one-way doors** and deserve slow, deliberate processes. Treating every decision as irreversible causes paralysis; treating irreversible ones as casual causes disasters. The app changes its warnings based on this answer.

## 3. Widening the frame (options step)

Paul Nutt's study of 168 organisational decisions found that only 29% considered more than one alternative — and "whether or not" decisions failed at far higher rates over the long term than "which of these" decisions. Chip and Dan Heath popularised the fix as the first step of their **WRAP framework** (*W*iden your options, *R*eality-test assumptions, *A*ttain distance, *P*repare to be wrong) — the skeleton this whole app follows. The "vanishing options test" in the app is taken directly from their work.

- Nutt, P. (1993). *The identification of solution ideas during organizational decision making.* Management Science, 39(9).
- Heath, C. & Heath, D. (2013). *Decisive: How to Make Better Choices in Life and Work.*

## 4. Weighted pros and cons

In a 1772 letter to Joseph Priestley, Benjamin Franklin described his "moral or prudential algebra": divide a sheet into Pro and Con, add reasons over several days, estimate their respective weights, and strike out items of equal weight until one side prevails. This is the ancestor of modern **multi-attribute utility theory** (Keeney & Raiffa, 1976). The 1–5 weighting in the app is deliberately coarse — precision theatre in weights adds noise, not signal.

## 5. The bias checklist

Naming a bias while deciding measurably weakens (though never removes) its influence. The six included:

| Bias | Core finding | Key reference |
|------|--------------|---------------|
| Sunk cost fallacy | Past unrecoverable costs irrationally inflate commitment | Arkes & Blumer (1985) |
| Confirmation bias | We seek and weigh evidence that supports our existing lean | Nickerson (1998) |
| Loss aversion | Losses loom ~2× larger than equivalent gains | Kahneman & Tversky (1979), prospect theory |
| Social pressure | Choices shift under observation and perceived approval | Asch (1951); Cialdini (1984) |
| Emotional state (HALT) | Incidental emotions carry over into unrelated risk judgements | Lerner et al. (2015), *Emotion and Decision Making*, Annual Review of Psychology |
| Outside view / base rates | Reference-class forecasting beats inside-view optimism | Kahneman & Lovallo (1993) |

## 6. The premortem

Gary Klein's technique: assume the decision has already failed and generate reasons why. Mitchell, Russo & Pennington (1989) found this "prospective hindsight" framing increased the number of correctly identified failure causes by roughly 30%. Daniel Kahneman has repeatedly named it his favourite debiasing method because it legitimises dissent — pessimism becomes an assignment rather than disloyalty.

- Klein, G. (2007). *Performing a project premortem.* Harvard Business Review, 85(9).
- Mitchell, D. J., Russo, J. E., & Pennington, N. (1989). *Back to the future: Temporal perspective in the explanation of events.* Journal of Behavioral Decision Making, 2(1).

## 7. Tripwires

From *Decisive*: autopilot is the enemy of course correction, so set an explicit signal or date that forces re-evaluation ("if X hasn't happened by June, we stop"). Tripwires convert vague unease into a scheduled decision.

## 8. Close calls and the coin-flip test

When two options score nearly the same after honest weighting, the expected-value difference is usually within your margin of error — either choice is fine, and speed matters more than further analysis. A practical trick: flip a coin, and notice whether the result relieves or disappoints you. The feeling, not the coin, is the answer. (Steven Levitt's 2021 field experiment on coin-flip decisions also found that people who made the *change* on major close-call decisions reported being happier months later.)

- Levitt, S. (2021). *Heads or tails: The impact of a coin toss on major life decisions and subsequent happiness.* Review of Economic Studies, 88(1).

## 9. Implementation intentions (next steps)

Peter Gollwitzer's research: forming a specific "when-where-how" plan (an implementation intention) roughly doubles the rate of goal completion versus mere intention. Telling another person adds social commitment. Hence the app's final two prompts: the smallest step within 48 hours, and who you'll tell.

- Gollwitzer, P. M. (1999). *Implementation intentions: Strong effects of simple plans.* American Psychologist, 54(7).
