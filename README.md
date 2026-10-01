# How a decision tree is built

Live site: [pezzonovante7.github.io/decision-tree-visualizer](https://pezzonovante7.github.io/decision-tree-visualizer/)

A step-through visualizer for the ID3 algorithm on the `buys_computer` table. It uses the same rows and the same information-gain math as [pezzonovante7/Decision-Tree](https://github.com/pezzonovante7/Decision-Tree).

Pushes to `main` build the site and deploy it with GitHub Actions (`.github/workflows/pages.yml`). The Pages source is GitHub Actions, and the public URL is `https://pezzonovante7.github.io/decision-tree-visualizer/`.

## Run

```bash
npm install
npm run verify
npm run dev
```

Open the URL Vite prints. **Build the tree** steps through entropy, gain, and the recursive calls. **Use the tree** walks any of the 14 people down the finished tree.

Keyboard, in Build: `←` `→` step, `space` play, `Home` / `End` jump.

## What matches the Java program

- Data is `src/data/input.csv`, the same 14 rows as `input.csv` in that repository.
- `Info(D) = − Σ p log₂(p)`, written as `−p · ln(p) / ln(2)` in `DecisionTreeConstruction.infoGain`.
- The split is the attribute with the largest gain. A tie keeps the earlier column, because the code updates only when `attr_gain > maxGain`.
- `RID` is never a candidate. The Java loop starts at column 1 and stops before the class column.
- The chosen attribute is removed before the recursive call, matching `split`.
- Branch order on screen is first appearance in the file. The Java code stores values in a `HashSet`, so its printed order can differ. The questions and the leaf labels do not.

Numbers on screen are the Java program's full-precision gains, rounded to 3 decimals only for display: Gain(age) = 0.247, Gain(student) = 0.152, Gain(credit_rating) = 0.048, Gain(income) = 0.029. Slides often print 0.246 and 0.151 because they round every entropy to 3 decimals before subtracting. The winning attribute is the same either way. `npm run verify` checks the tree, the gains, and that every training row is classified correctly.
