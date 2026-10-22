# React examples (Full-Stack Handbook topics 129-170, 220-221)

React 19 + Vite, tested with Vitest, Testing Library and jsdom. Each topic is a component/hook file
(`src/NNN-slug.jsx`) and a test (`src/NNN-slug.test.jsx`) that asserts the behaviour: render counts,
bug vs fix, aborted requests, DOM mutations, and so on.

```bash
npm install
npm test            # every topic, one pass/fail line per file
npm run ex 144      # one topic (also finds shared files: `npm run ex 151` runs 150-151)
npm run dev         # small page with live versions of a few demos
```

Notes

- `vitest.setup.js` turns any "not wrapped in act(...)" warning into a test failure. Tests that
  expect React to log an error (error boundary, rules of hooks, infinite loop, hydration) silence
  `console.error` explicitly in that test and say why.
- Topics 138 and 152 read React's private fiber fields (`__reactFiber$...`) to make the internals
  visible. That is for illustration only; never do it in application code.
- Topic 154 shows lane ordering (urgent renders before a transition queued earlier). True
  interruption of a render needs the browser scheduler and is not observable in jsdom.
- jsdom does no layout or painting, so 158 supplies scroll sizes by hand and 220's tooltip test
  checks the measured position rather than "no flicker".
- 221's debounced-search test types with `fireEvent` because `userEvent` deadlocks with Vitest fake
  timers (Testing Library only auto-advances Jest's fake timers).

| Topic | Title | File | Run |
|---|---|---|---|
| 129 | What is React and Why Use It? | `src/129-131-react-vdom-jsx.jsx` + `.test.jsx` | `npm run ex 129` |
| 130 | The Virtual DOM | `src/129-131-react-vdom-jsx.jsx` + `.test.jsx` | `npm run ex 130` |
| 131 | JSX | `src/129-131-react-vdom-jsx.jsx` + `.test.jsx` | `npm run ex 131` |
| 132 | Functional vs Class Components | `src/132-class-vs-function.jsx` + `.test.jsx` | `npm run ex 132` |
| 133 | Props vs State | `src/133-props-vs-state.jsx` + `.test.jsx` | `npm run ex 133` |
| 134 | Declarative vs Imperative | `src/134-declarative-ui.jsx` + `.test.jsx` | `npm run ex 134` |
| 135 | Immutability | `src/135-immutability.jsx` + `.test.jsx` | `npm run ex 135` |
| 136 | Lists and Keys | `src/136-list-keys.jsx` + `.test.jsx` | `npm run ex 136` |
| 137 | Controlled vs Uncontrolled Inputs | `src/137-controlled-uncontrolled.jsx` + `.test.jsx` | `npm run ex 137` |
| 138 | useState - How It Works Internally | `src/138-usestate-internals.jsx` + `.test.jsx` | `npm run ex 138` |
| 139 | setState is Asynchronous and Batched | `src/139-setstate-batching.jsx` + `.test.jsx` | `npm run ex 139` |
| 140 | useEffect - Side Effects | `src/140-useeffect-cleanup.jsx` + `.test.jsx` | `npm run ex 140` |
| 141 | The Dependency Array Rules | `src/141-dependency-array.jsx` + `.test.jsx` | `npm run ex 141` |
| 142 | You Might Not Need an Effect | `src/142-no-effect-needed.jsx` + `.test.jsx` | `npm run ex 142` |
| 143 | useRef - The Persistent Box | `src/143-useref.jsx` + `.test.jsx` | `npm run ex 143` |
| 144 | useMemo and useCallback | `src/144-usememo-usecallback.jsx` + `.test.jsx` | `npm run ex 144` |
| 145 | useReducer | `src/145-usereducer.jsx` + `.test.jsx` | `npm run ex 145` |
| 146 | useContext - Avoiding Prop Drilling | `src/146-usecontext.jsx` + `.test.jsx` | `npm run ex 146` |
| 147 | useLayoutEffect, useId, useTransition, useDeferredValue | `src/147-concurrent-hooks.jsx` + `.test.jsx` | `npm run ex 147` |
| 148 | Custom Hooks | `src/148-custom-hooks.jsx` + `.test.jsx` | `npm run ex 148` |
| 149 | Rules of Hooks | `src/149-rules-of-hooks.jsx` + `.test.jsx` | `npm run ex 149` |
| 150 | Reconciliation and the Diffing Algorithm | `src/150-151-reconciliation-keys.jsx` + `.test.jsx` | `npm run ex 150` |
| 151 | Why Keys Matter in Diffing | `src/150-151-reconciliation-keys.jsx` + `.test.jsx` | `npm run ex 151` |
| 152 | Fiber Architecture | `src/152-153-fiber-and-phases.jsx` + `.test.jsx` | `npm run ex 152` |
| 153 | Render Phase vs Commit Phase | `src/152-153-fiber-and-phases.jsx` + `.test.jsx` | `npm run ex 153` |
| 154 | Concurrent Rendering and Priority Lanes | `src/154-priority-lanes.jsx` + `.test.jsx` | `npm run ex 154` |
| 155 | What Triggers a Re-render? | `src/155-156-rerenders-and-memo.jsx` + `.test.jsx` | `npm run ex 155` |
| 156 | React.memo | `src/155-156-rerenders-and-memo.jsx` + `.test.jsx` | `npm run ex 156` |
| 157 | Code Splitting with React.lazy and Suspense | `src/157-lazy-suspense.jsx` + `.test.jsx` | `npm run ex 157` |
| 158 | List Virtualization | `src/158-virtualization.jsx` + `.test.jsx` | `npm run ex 158` |
| 159 | How to Optimize a Slow React App | `src/159-optimize-slow-app.jsx` + `.test.jsx` | `npm run ex 159` |
| 160 | Error Boundaries | `src/160-error-boundary.jsx` + `.test.jsx` | `npm run ex 160` |
| 161 | Portals and Refs Forwarding | `src/161-portals-and-refs.jsx` + `.test.jsx` | `npm run ex 161` |
| 162 | Redux Core Concepts | `src/162-redux-core.jsx` + `.test.jsx` | `npm run ex 162` |
| 163 | Redux Toolkit | `src/163-164-redux-toolkit.jsx` + `.test.jsx` | `npm run ex 163` |
| 164 | Redux Middleware and Async (Thunks) | `src/163-164-redux-toolkit.jsx` + `.test.jsx` | `npm run ex 164` |
| 165 | Choosing State Management (Zustand) | `src/165-zustand-state-choice.jsx` + `.test.jsx` | `npm run ex 165` |
| 166 | React Router | `src/166-react-router.jsx` + `.test.jsx` | `npm run ex 166` |
| 167 | SSR and Hydration | `src/167-ssr-hydration.jsx` + `.test.jsx` | `npm run ex 167` |
| 168 | Testing React | `src/168-testing-react.jsx` + `.test.jsx` | `npm run ex 168` |
| 169 | React Security (XSS) | `src/169-xss.jsx` + `.test.jsx` | `npm run ex 169` |
| 170 | Interview: Explain Reconciliation to a Junior | `src/170-explain-reconciliation.jsx` + `.test.jsx` | `npm run ex 170` |
| 220 | React Questions | `src/220-react-questions.jsx` + `.test.jsx` | `npm run ex 220` |
| 221 | React Coding Questions | `src/221-debounced-search.jsx` + `.test.jsx`<br>`src/221-infinite-scroll.jsx` + `.test.jsx`<br>`src/221-modal.jsx` + `.test.jsx`<br>`src/221-use-previous.jsx` + `.test.jsx` | `npm run ex 221` |
