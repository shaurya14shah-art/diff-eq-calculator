/* ============================================================
   DiffEq Solver — Application Logic
   Parsing · Symbolic Solving · Numerical RK4 · Graphing · UI
   ============================================================ */

(() => {
  'use strict';

  /* ────────────────────────────
     1. STATE
     ──────────────────────────── */
  const state = {
    mode: 'single',          // 'single' | 'system'
    constants: new Map(),    // name → { value, min, max }
    lastResult: null,        // cached solve result
    activeGraph: 'solution', // 'solution' | 'slope' | 'phase' | 'projections'
    systemVars: ['x', 'y'], // variable names for system mode
    phaseAxes: { x: 0, y: 1, z: 2, color: 't' }, // indices into varNames or 't'
  };

  /* ────────────────────────────
     2. DOM REFS
     ──────────────────────────── */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const DOM = {
    eqInput:        $('#eq-input'),
    katexPreview:   $('#katex-preview'),
    presetSelect:   $('#preset-select'),
    btnSolve:       $('#btn-solve'),
    btnHelp:        $('#btn-help'),
    eqTypeTabs:     $('#eq-type-tabs'),
    inputSingle:    $('#input-single'),
    inputSystem:    $('#input-system'),
    systemEqs:      $('#system-equations'),
    btnAddEq:       $('#btn-add-eq'),
    icX0:           $('#ic-x0'),
    icY0:           $('#ic-y0'),
    icDY0:          $('#ic-dy0'),
    icXEnd:         $('#ic-xend'),
    icStep:         $('#ic-step'),
    icGrid:         $('#ic-grid'),
    constantsList:  $('#constants-list'),
    newConstName:   $('#new-const-name'),
    newConstValue:  $('#new-const-value'),
    btnAddConst:    $('#btn-add-const'),
    plotArea:       $('#plot-area'),
    graphPlaceholder: $('#graph-placeholder'),
    graphTabs:      $('#graph-tabs'),
    cardSolution:   $('#card-solution'),
    solutionBadge:  $('#solution-type-badge'),
    solutionSteps:  $('#solution-steps'),
  };

  /* ────────────────────────────
     3. PRESETS
     ──────────────────────────── */
  const PRESETS = {
    exponential: {
      mode: 'single',
      equation: "dy/dx = k*y",
      constants: { k: { value: 1, min: -5, max: 5 } },
      ic: { x0: 0, y0: 1, dy0: 0, xEnd: 5, step: 0.01 },
    },
    logistic: {
      mode: 'single',
      equation: "dy/dx = r*y*(1 - y/K)",
      constants: { r: { value: 1, min: 0.1, max: 5 }, K: { value: 10, min: 1, max: 50 } },
      ic: { x0: 0, y0: 0.5, dy0: 0, xEnd: 15, step: 0.01 },
    },
    linear1: {
      mode: 'single',
      equation: "dy/dx + 2*y = x",
      constants: {},
      ic: { x0: 0, y0: 0, dy0: 0, xEnd: 5, step: 0.01 },
    },
    sho: {
      mode: 'single',
      equation: "y'' + w^2*y = 0",
      constants: { w: { value: 2, min: 0.1, max: 10 } },
      ic: { x0: 0, y0: 1, dy0: 0, xEnd: 15, step: 0.01 },
    },
    damped: {
      mode: 'single',
      equation: "y'' + 2*z*w*y' + w^2*y = 0",
      constants: { z: { value: 0.3, min: 0, max: 2 }, w: { value: 3, min: 0.1, max: 10 } },
      ic: { x0: 0, y0: 1, dy0: 0, xEnd: 10, step: 0.01 },
    },
    forced: {
      mode: 'single',
      equation: "y'' + 2*y' + 5*y = cos(x)",
      constants: {},
      ic: { x0: 0, y0: 0, dy0: 0, xEnd: 20, step: 0.01 },
    },
    'lotka-volterra': {
      mode: 'system',
      equations: [
        { var: 'x', expr: 'a*x - b*x*y' },
        { var: 'y', expr: 'd*x*y - g*y' },
      ],
      constants: {
        a: { value: 1.1, min: 0, max: 5 },
        b: { value: 0.4, min: 0, max: 2 },
        d: { value: 0.1, min: 0, max: 2 },
        g: { value: 0.4, min: 0, max: 5 },
      },
      ic: { x0: 0, xEnd: 80, step: 0.01 },
      systemIC: { x: 10, y: 10 },
    },
    vanderpol: {
      mode: 'system',
      equations: [
        { var: 'x', expr: 'y' },
        { var: 'y', expr: 'mu*(1 - x^2)*y - x' },
      ],
      constants: { mu: { value: 1.5, min: 0, max: 5 } },
      ic: { x0: 0, xEnd: 30, step: 0.01 },
      systemIC: { x: 2, y: 0 },
    },
    lorenz: {
      mode: 'system',
      equations: [
        { var: 'x', expr: 's*(y - x)' },
        { var: 'y', expr: 'x*(rho - z) - y' },
        { var: 'z', expr: 'x*y - beta*z' },
      ],
      constants: {
        s: { value: 10, min: 0, max: 30 },
        rho: { value: 28, min: 0, max: 50 },
        beta: { value: 2.667, min: 0, max: 10 },
      },
      ic: { x0: 0, xEnd: 50, step: 0.005 },
      systemIC: { x: 1, y: 1, z: 1 },
    },
    rossler: {
      mode: 'system',
      equations: [
        { var: 'x', expr: '-(y + z)' },
        { var: 'y', expr: 'x + a*y' },
        { var: 'z', expr: 'b + z*(x - c)' },
      ],
      constants: {
        a: { value: 0.2, min: 0, max: 1 },
        b: { value: 0.2, min: 0, max: 1 },
        c: { value: 5.7, min: 1, max: 20 },
      },
      ic: { x0: 0, xEnd: 200, step: 0.01 },
      systemIC: { x: 1, y: 1, z: 0 },
    },
    'hyperchaotic-chen': {
      mode: 'system',
      equations: [
        { var: 'x', expr: 'a*(y - x)' },
        { var: 'y', expr: '-x*z + d*x + c*y - w' },
        { var: 'z', expr: 'x*y - b*z' },
        { var: 'w', expr: 'x + k' },
      ],
      constants: {
        a: { value: 36, min: 10, max: 50 },
        b: { value: 3, min: 0, max: 10 },
        c: { value: 28, min: 10, max: 40 },
        d: { value: 16, min: 5, max: 25 },
        k: { value: 0.5, min: 0, max: 5 },
      },
      ic: { x0: 0, xEnd: 20, step: 0.002 },
      systemIC: { x: 1, y: 1, z: 1, w: 1 },
    },
    'coupled-oscillators': {
      mode: 'system',
      equations: [
        { var: 'x1', expr: 'v1' },
        { var: 'v1', expr: '-k1*x1 + kc*(x2 - x1)' },
        { var: 'x2', expr: 'v2' },
        { var: 'v2', expr: '-k2*x2 + kc*(x1 - x2)' },
      ],
      constants: {
        k1: { value: 1, min: 0.1, max: 10 },
        k2: { value: 2, min: 0.1, max: 10 },
        kc: { value: 0.5, min: 0, max: 5 },
      },
      ic: { x0: 0, xEnd: 40, step: 0.01 },
      systemIC: { x1: 1, v1: 0, x2: 0, v2: 0 },
    },
    'sir-model': {
      mode: 'system',
      equations: [
        { var: 'S', expr: '-beta*S*I/N' },
        { var: 'I', expr: 'beta*S*I/N - gamma*I' },
        { var: 'R', expr: 'gamma*I' },
      ],
      constants: {
        beta: { value: 0.3, min: 0, max: 1 },
        gamma: { value: 0.1, min: 0, max: 0.5 },
        N: { value: 1000, min: 100, max: 10000 },
      },
      ic: { x0: 0, xEnd: 160, step: 0.1 },
      systemIC: { S: 999, I: 1, R: 0 },
    },
    'double-pendulum': {
      mode: 'system',
      equations: [
        { var: 'th1', expr: 'w1' },
        { var: 'w1', expr: '(-g*(2*m1+m2)*sin(th1) - m2*g*sin(th1-2*th2) - 2*sin(th1-th2)*m2*(w2^2*L2+w1^2*L1*cos(th1-th2))) / (L1*(2*m1+m2-m2*cos(2*th1-2*th2)))' },
        { var: 'th2', expr: 'w2' },
        { var: 'w2', expr: '(2*sin(th1-th2)*(w1^2*L1*(m1+m2)+g*(m1+m2)*cos(th1)+w2^2*L2*m2*cos(th1-th2))) / (L2*(2*m1+m2-m2*cos(2*th1-2*th2)))' },
      ],
      constants: {
        m1: { value: 1, min: 0.1, max: 5 },
        m2: { value: 1, min: 0.1, max: 5 },
        L1: { value: 1, min: 0.1, max: 3 },
        L2: { value: 1, min: 0.1, max: 3 },
        g: { value: 9.81, min: 1, max: 20 },
      },
      ic: { x0: 0, xEnd: 20, step: 0.001 },
      systemIC: { th1: 2.0, w1: 0, th2: 2.5, w2: 0 },
    },
  };

  /* ────────────────────────────
     PRIME REGEX HELPERS
     Matches any style of prime/apostrophe:
     U+0027 ('), U+2018 ('), U+2019 ('), U+2032 (′), U+2033 (″)
     ──────────────────────────── */
  const PRIME_CHAR = "['\u2018\u2019\u2032]";                  // single prime
  const DOUBLE_PRIME = `(?:${PRIME_CHAR}${PRIME_CHAR}|\u2033)`; // double prime
  const RE_DOUBLE_PRIME = new RegExp(`y${DOUBLE_PRIME}`, 'g');
  const RE_SINGLE_PRIME = new RegExp(`y${PRIME_CHAR}`, 'g');
  const RE_HAS_DOUBLE   = new RegExp(`y${DOUBLE_PRIME}`);
  const RE_HAS_SINGLE   = new RegExp(`y${PRIME_CHAR}`);

  /* ────────────────────────────
     4. PARSER — Equation String → Computable Form
     ──────────────────────────── */
  const Parser = {
    /**
     * Normalise all prime characters to a canonical ASCII form
     * so the rest of the parser only deals with y'' and y'
     */
    normalisePrimes(s) {
      s = s.replace(RE_DOUBLE_PRIME, "y''");
      s = s.replace(RE_SINGLE_PRIME, "y'");
      return s;
    },

    /**
     * Detect type and parse a single ODE string.
     * Returns { order, type, rhsExpr, lhsCoeffs?, ... }
     */
    parse(eqStr) {
      eqStr = this.normalisePrimes(eqStr.trim());

      const info = { raw: eqStr, order: 0, type: 'unknown' };

      // Check if it's dy/dx = ... form (first order explicit)
      const dyDxMatch = eqStr.match(/^d([a-zA-Z])\/d([a-zA-Z])\s*=\s*(.+)$/i);
      if (dyDxMatch) {
        info.depVar = dyDxMatch[1];
        info.indVar = dyDxMatch[2];
        info.order = 1;
        info.rhs = dyDxMatch[3].trim();
        info.type = 'first-order-explicit';
        return info;
      }

      // Check for dy/dx + ... = ... form (first order with LHS terms)
      const dyDxLhsMatch = eqStr.match(/^d([a-zA-Z])\/d([a-zA-Z])\s*([\+\-].+)$/i);
      if (dyDxLhsMatch) {
        info.depVar = dyDxLhsMatch[1];
        info.indVar = dyDxLhsMatch[2];
        info.order = 1;
        const parts = (dyDxLhsMatch[3]).split('=');
        if (parts.length === 2) {
          const lhsRemainder = parts[0].trim();
          const rhsSide = parts[1].trim();
          info.rhs = `(${rhsSide}) - (${lhsRemainder})`;
          info.type = 'first-order-explicit';
        } else {
          info.rhs = `-(${dyDxLhsMatch[3].trim()})`;
          info.type = 'first-order-explicit';
        }
        return info;
      }

      // Check for second order: contains y''
      const hasSecondDeriv = /y''/.test(eqStr);
      const hasFirstDeriv = /y'/.test(eqStr);

      if (hasSecondDeriv) {
        info.order = 2;
        info.depVar = 'y';
        info.indVar = 'x';
        return this.parseSecondOrder(eqStr, info);
      }

      if (hasFirstDeriv) {
        info.order = 1;
        info.depVar = 'y';
        info.indVar = 'x';
        return this.parseFirstOrderPrime(eqStr, info);
      }

      // Fallback: try to interpret as dy/dx = rhs
      info.order = 1;
      info.depVar = 'y';
      info.indVar = 'x';
      info.rhs = eqStr;
      info.type = 'first-order-explicit';
      return info;
    },

    /** Parse y' + P(x)*y = Q(x) or y' = f(x,y) forms */
    parseFirstOrderPrime(eqStr, info) {
      let s = eqStr.replace(/y'/g, 'YPRIME');

      const eqParts = s.split('=');
      let lhs, rhs;
      if (eqParts.length === 2) {
        lhs = eqParts[0].trim();
        rhs = eqParts[1].trim();
      } else {
        lhs = s;
        rhs = '0';
      }

      // If LHS is just YPRIME, then it's explicit
      if (lhs === 'YPRIME') {
        info.rhs = rhs;
        info.type = 'first-order-explicit';
        return info;
      }

      // Otherwise move everything to RHS: YPRIME + stuff = other → YPRIME = other - stuff
      if (/YPRIME/.test(lhs)) {
        const remainder = lhs.replace('YPRIME', '').trim();
        if (remainder) {
          info.rhs = `(${rhs}) - (${remainder})`;
        } else {
          info.rhs = rhs;
        }
        info.type = 'first-order-explicit';
        return info;
      }

      info.rhs = eqStr;
      info.type = 'first-order-explicit';
      return info;
    },

    /** Parse second order: y'' + by' + cy = f(x) */
    parseSecondOrder(eqStr, info) {
      // Replace y'' → YPP, y' → YP (order matters)
      let s = eqStr.replace(/y''/g, 'YPP').replace(/y'/g, 'YP');

      const eqParts = s.split('=');
      let lhs = eqParts[0].trim();
      let rhs = eqParts.length === 2 ? eqParts[1].trim() : '0';

      info.type = 'second-order';
      info.lhsRaw = lhs.replace(/YPP/g, "y''").replace(/YP/g, "y'");
      info.rhsRaw = rhs.replace(/YPP/g, "y''").replace(/YP/g, "y'");

      // Build RHS expression for numerical solver: y'' = rhs - (lhs without YPP term)
      // Remove the YPP term (with optional coefficient) from LHS
      let lhsWithoutYpp = lhs
        .replace(/[+\-]?\s*[\d.]*\s*\*?\s*YPP/, '')   // remove ±coeff*YPP
        .replace(/^\s*[+]\s*/, '')                       // clean leading +
        .trim();

      if (lhsWithoutYpp) {
        info.rhs = `(${rhs}) - (${lhsWithoutYpp})`;
      } else {
        info.rhs = rhs;
      }

      // Replace YP with yp for math.js (yp = y')
      info.rhs = info.rhs.replace(/YPP/g, 'ypp').replace(/YP/g, 'yp');

      // Try to extract constant coefficients for symbolic solving
      info.constantCoeff = this.tryExtractConstCoeffs(lhs, rhs);

      return info;
    },

    /**
     * Try to extract constant coefficients a, b, c from a*y'' + b*y' + c*y = f(x)
     * Now supports named constants by evaluating them against state.constants.
     */
    tryExtractConstCoeffs(lhs, rhs) {
      try {
        // Tokenize: split on + or - while keeping the sign
        const terms = lhs.replace(/\s+/g, '').match(/[+-]?[^+-]+/g) || [];

        let aStr = null, bStr = '0', cStr = '0';
        let foundYPP = false;

        for (const term of terms) {
          if (term.includes('YPP')) {
            foundYPP = true;
            const coeff = term.replace(/\*?YPP/, '').replace(/\*$/, '');
            aStr = coeff === '' || coeff === '+' ? '1' : coeff === '-' ? '-1' : coeff;
          } else if (term.includes('YP')) {
            const coeff = term.replace(/\*?YP/, '').replace(/\*$/, '');
            bStr = coeff === '' || coeff === '+' ? '1' : coeff === '-' ? '-1' : coeff;
          } else if (term.includes('y')) {
            const coeff = term.replace(/\*?y$/, '').replace(/\*$/, '');
            cStr = coeff === '' || coeff === '+' ? '1' : coeff === '-' ? '-1' : coeff;
          }
        }

        if (!foundYPP) return null;

        // Try to evaluate as numbers (they may be pure numbers or expressions with constants)
        const scope = Object.fromEntries(
          [...state.constants].map(([k, v]) => [k, v.value])
        );

        let a, b, c;
        try {
          a = (aStr === '1' || aStr === '-1') ? parseFloat(aStr) : math.evaluate(aStr, scope);
          b = (bStr === '0' || bStr === '1' || bStr === '-1') ? parseFloat(bStr) : math.evaluate(bStr, scope);
          c = (cStr === '0' || cStr === '1' || cStr === '-1') ? parseFloat(cStr) : math.evaluate(cStr, scope);
        } catch {
          return null;
        }

        if (!isFinite(a) || !isFinite(b) || !isFinite(c)) return null;

        return { a, b, c, rhs };
      } catch {
        return null;
      }
    },

    /** Convert equation string to LaTeX for KaTeX preview */
    toLatex(eqStr) {
      if (!eqStr) return '';
      let s = this.normalisePrimes(eqStr);

      // Replace dy/dx with fraction
      s = s.replace(/d([a-zA-Z])\/d([a-zA-Z])/g, '\\frac{d$1}{d$2}');
      // Replace y'' with proper LaTeX double-prime
      s = s.replace(/y''/g, "y''");
      // Replace y' with proper LaTeX prime
      s = s.replace(/y'/g, "y'");
      // Replace * with \cdot
      s = s.replace(/\*/g, ' \\cdot ');
      // Replace ^ with LaTeX superscript
      s = s.replace(/\^(\d+)/g, '^{$1}');
      s = s.replace(/\^([a-zA-Z])/g, '^{$1}');
      // Wrap common functions
      s = s.replace(/\bsin\b/g, '\\sin');
      s = s.replace(/\bcos\b/g, '\\cos');
      s = s.replace(/\btan\b/g, '\\tan');
      s = s.replace(/\bexp\b/g, '\\exp');
      s = s.replace(/\bln\b/g, '\\ln');
      s = s.replace(/\blog\b/g, '\\log');
      s = s.replace(/\bsqrt\b/g, '\\sqrt');
      return s;
    },
  };

  /* ────────────────────────────
     5. SYMBOLIC SOLVER
     ──────────────────────────── */
  const SymbolicSolver = {
    /**
     * Attempt symbolic solution. Returns { success, steps[], solution } or { success: false }
     */
    solve(parsed, constants) {
      if (parsed.order === 1) {
        return this.solveFirstOrder(parsed, constants);
      }
      if (parsed.order === 2 && parsed.constantCoeff) {
        return this.solveConstCoeff2(parsed, constants);
      }
      return { success: false, reason: 'No symbolic method available — using numerical solver.' };
    },

    /** Solve dy/dx = f(x, y) symbolically using Algebrite */
    solveFirstOrder(parsed, constants) {
      if (typeof Algebrite === 'undefined') {
        return { success: false, reason: 'Algebrite CAS is not loaded.' };
      }

      const algEval = (expr) => {
        const res = Algebrite.run(expr);
        if (typeof res === 'string' && (res.includes('Stop:') || res === '')) {
          throw new Error('Algebrite evaluation error: ' + res);
        }
        return res.toString();
      };

      const algClean = (expr) => algEval(`simplify(${expr})`);

      const algLatex = (expr) => algEval(`printlatex(${expr})`);

      try {
        const x = parsed.indVar || 'x';
        const y = parsed.depVar || 'y';
        // Use math.js cleaner to fix implicit multiplication, works well for Algebrite too
        const f = cleanRhsForMathJs(parsed.rhs);
        
        // 1. Test Separability: cross partials condition f * f_xy - f_x * f_y == 0
        const isSeparableTest = algClean(`simplify( (${f}) * d(d(${f}, ${x}), ${y}) - d(${f}, ${x}) * d(${f}, ${y}) )`);
        const isSeparable = isSeparableTest === '0';

        if (isSeparable) {
          return this.solveSeparable(f, x, y, algEval, algClean, algLatex, parsed);
        }

        // 2. Test Linearity: d^2f/dy^2 == 0
        const isLinearTest = algClean(`d(d(${f}, ${y}), ${y})`);
        const isLinear = isLinearTest === '0';

        if (isLinear) {
          return this.solveLinear(f, x, y, algEval, algClean, algLatex, parsed);
        }

        return { success: false, reason: 'Equation is neither linear nor separable.' };
      } catch (e) {
        console.error('Symbolic solver error:', e);
        return { success: false, reason: 'Symbolic solver encountered an error: ' + e.message };
      }
    },

    solveSeparable(f, x, y, algEval, algClean, algLatex, parsed) {
      let X_expr, Y_expr;
      // Find a y0 where f(x, y0) is not zero to separate variables
      for (const y0 of [1, 0, 2, -1, -2]) {
        const testX = algClean(`eval(${f}, ${y}, ${y0})`);
        if (testX !== '0') {
          X_expr = testX;
          Y_expr = algClean(`(${f}) / (${X_expr})`);
          break;
        }
      }
      if (!X_expr) return { success: false, reason: 'Failed to separate variables.' };

      const invY = algClean(`1 / (${Y_expr})`);
      const intX = algEval(`integral(${X_expr}, ${x})`);
      const intY = algEval(`integral(${invY}, ${y})`);
      
      const steps = [];
      const latexF = Parser.toLatex(f);
      const latexX = algLatex(X_expr);
      const latexY = algLatex(Y_expr);
      const latexInvY = algLatex(invY);
      const latexIntX = algLatex(intX);
      const latexIntY = algLatex(intY);

      steps.push({ label: 'Equation Type', latex: `\\frac{d${y}}{d${x}} = ${latexF} \\quad \\text{(Separable)}` });
      steps.push({ label: 'Separate Variables', latex: `${latexInvY} d${y} = ${latexX} d${x}` });
      steps.push({ label: 'Integrate Both Sides', latex: `\\int ${latexInvY} d${y} = \\int ${latexX} d${x}` });
      steps.push({ label: 'Evaluate Integrals', latex: `${latexIntY} = ${latexIntX} + C`, highlight: true });

      return { success: true, type: '1st-Order Separable', steps, solutionLatex: `${latexIntY} = ${latexIntX} + C` };
    },

    solveLinear(f, x, y, algEval, algClean, algLatex, parsed) {
      // Equation: dy/dx = Q(x) - P(x)y
      const P_expr = algClean(`-d(${f}, ${y})`);
      const Q_expr = algClean(`eval(${f}, ${y}, 0)`);
      
      const intP = algEval(`integral(${P_expr}, ${x})`);
      const mu = algClean(`exp(${intP})`);
      
      const muQ = algClean(`(${mu}) * (${Q_expr})`);
      const intMuQ = algEval(`integral(${muQ}, ${x})`);
      
      const steps = [];
      const latexP = algLatex(P_expr);
      const latexQ = algLatex(Q_expr);
      const latexIntP = algLatex(intP);
      const latexMu = algLatex(mu);
      const latexMuQ = algLatex(muQ);
      const latexIntMuQ = algLatex(intMuQ);

      steps.push({ label: 'Standard Form', latex: `\\frac{d${y}}{d${x}} + (${latexP})${y} = ${latexQ}` });
      steps.push({ label: 'Integrating Factor', latex: `\\mu(${x}) = e^{\\int (${latexP}) d${x}} = e^{${latexIntP}} = ${latexMu}` });
      steps.push({ label: 'Multiply & Group', latex: `\\frac{d}{d${x}} \\left( ${latexMu} \\cdot ${y} \\right) = ${latexMuQ}` });
      steps.push({ label: 'Integrate', latex: `${latexMu} \\cdot ${y} = \\int (${latexMuQ}) d${x} = ${latexIntMuQ} + C` });
      
      const ySolution = algClean(`(${intMuQ} + C) / (${mu})`);
      const latexY = algLatex(ySolution);
      
      steps.push({ label: 'General Solution', latex: `${y}(${x}) = ${latexY}`, highlight: true });

      return { success: true, type: '1st-Order Linear', steps, solutionLatex: `${y}(${x}) = ${latexY}` };
    },

    /** Solve ay'' + by' + cy = 0 (homogeneous constant coefficient) */
    solveConstCoeff2(parsed, constants) {
      const cc = parsed.constantCoeff;
      let { a, b, c, rhs } = cc;

      // Check if homogeneous (rhs ≈ "0")
      const rhsTrimmed = (rhs || '0').replace(/\s/g, '');
      const isHomogeneous = rhsTrimmed === '0';

      if (!isHomogeneous) {
        // Try to check if rhs evaluates to zero with constants
        try {
          const scope = Object.fromEntries([...constants].map(([k, v]) => [k, v.value]));
          const rhsVal = math.evaluate(rhsTrimmed, scope);
          if (rhsVal !== 0) {
            return { success: false, reason: 'Non-homogeneous symbolic solving not fully implemented — using numerical.' };
          }
        } catch {
          return { success: false, reason: 'Non-homogeneous symbolic solving not fully implemented — using numerical.' };
        }
      }

      const steps = [];
      steps.push({
        label: 'Standard Form',
        latex: `y'' + ${this.fmtNum(b)}y' + ${this.fmtNum(c)}y = 0`,
      });

      // Characteristic equation: ar² + br + c = 0
      steps.push({
        label: 'Characteristic Equation',
        latex: `r^{2} + ${this.fmtNum(b)}r + ${this.fmtNum(c)} = 0`,
      });

      const disc = b * b - 4 * a * c;
      steps.push({
        label: 'Discriminant',
        latex: `\\Delta = (${this.fmtNum(b)})^{2} - 4(${this.fmtNum(a)})(${this.fmtNum(c)}) = ${this.fmtNum(disc)}`,
      });

      let solution;
      if (disc > 1e-10) {
        const r1 = (-b + Math.sqrt(disc)) / (2 * a);
        const r2 = (-b - Math.sqrt(disc)) / (2 * a);
        steps.push({
          label: 'Roots (Real & Distinct)',
          latex: `r_1 = ${this.fmtNum(r1)}, \\quad r_2 = ${this.fmtNum(r2)}`,
        });
        solution = `y(x) = C_1 e^{${this.fmtNum(r1)}x} + C_2 e^{${this.fmtNum(r2)}x}`;
      } else if (Math.abs(disc) <= 1e-10) {
        const r = -b / (2 * a);
        steps.push({
          label: 'Root (Repeated)',
          latex: `r = ${this.fmtNum(r)}`,
        });
        solution = `y(x) = (C_1 + C_2 x) e^{${this.fmtNum(r)}x}`;
      } else {
        const realPart = -b / (2 * a);
        const imagPart = Math.sqrt(-disc) / (2 * a);
        steps.push({
          label: 'Roots (Complex)',
          latex: `r = ${this.fmtNum(realPart)} \\pm ${this.fmtNum(imagPart)}i`,
        });
        if (Math.abs(realPart) < 1e-10) {
          solution = `y(x) = C_1 \\cos(${this.fmtNum(imagPart)}x) + C_2 \\sin(${this.fmtNum(imagPart)}x)`;
        } else {
          solution = `y(x) = e^{${this.fmtNum(realPart)}x}\\left[C_1 \\cos(${this.fmtNum(imagPart)}x) + C_2 \\sin(${this.fmtNum(imagPart)}x)\\right]`;
        }
      }

      steps.push({ label: 'General Solution', latex: solution, highlight: true });

      return { success: true, type: '2nd-Order Constant Coefficient (Homogeneous)', steps, solutionLatex: solution };
    },

    fmtNum(n) {
      if (typeof n !== 'number') return String(n);
      if (Number.isInteger(n)) return String(n);
      return n.toFixed(4).replace(/\.?0+$/, '');
    },
  };

  /* ────────────────────────────
     6. NUMERICAL SOLVER (RK4)
     ──────────────────────────── */
  const NumericalSolver = {
    /**
     * Solve a first-order ODE: dy/dx = f(x, y)
     * @returns { xs, ys }
     */
    solveFirstOrder(rhsExpr, x0, y0, xEnd, h, constants, indVar = 'x', depVar = 'y') {
      const scope = { ...Object.fromEntries([...constants].map(([k, v]) => [k, v.value])) };
      const compiled = math.compile(rhsExpr);

      const xs = [x0];
      const ys = [y0];
      let x = x0;
      let y = y0;
      const nSteps = Math.ceil((xEnd - x0) / h);

      for (let i = 0; i < nSteps; i++) {
        try {
          scope[indVar] = x; scope[depVar] = y;
          const k1 = h * compiled.evaluate(scope);
          scope[indVar] = x + h / 2; scope[depVar] = y + k1 / 2;
          const k2 = h * compiled.evaluate(scope);
          scope[indVar] = x + h / 2; scope[depVar] = y + k2 / 2;
          const k3 = h * compiled.evaluate(scope);
          scope[indVar] = x + h; scope[depVar] = y + k3;
          const k4 = h * compiled.evaluate(scope);

          y = y + (k1 + 2 * k2 + 2 * k3 + k4) / 6;
          x = x + h;

          if (!isFinite(y) || Math.abs(y) > 1e15) break;

          xs.push(x);
          ys.push(y);
        } catch (e) {
          if (i === 0) throw new Error('Evaluation error: ' + e.message);
          console.warn('RK4 step error:', e.message);
          break;
        }
      }

      return { xs, ys };
    },

    /**
     * Solve second-order ODE by converting to system:
     *   y' = v,  v' = f(x, y, v)
     * The rhsExpr is f(x, y, yp) where yp is y'
     */
    solveSecondOrder(rhsExpr, x0, y0, dy0, xEnd, h, constants, indVar = 'x', depVar = 'y') {
      const scope = { ...Object.fromEntries([...constants].map(([k, v]) => [k, v.value])) };
      // Replace "yp" (y') with "v_" for internal variable
      const expr = rhsExpr.replace(/\byp\b/g, 'v_');
      const compiled = math.compile(expr);

      const xs = [x0];
      const ys = [y0];
      const dys = [dy0];
      let x = x0, y = y0, v = dy0;

      const nSteps = Math.ceil((xEnd - x0) / h);

      for (let i = 0; i < nSteps; i++) {
        try {
          // k1
          scope[indVar] = x; scope[depVar] = y; scope.v_ = v;
          const ky1 = h * v;
          const kv1 = h * compiled.evaluate(scope);

          // k2
          scope[indVar] = x + h / 2; scope[depVar] = y + ky1 / 2; scope.v_ = v + kv1 / 2;
          const ky2 = h * (v + kv1 / 2);
          const kv2 = h * compiled.evaluate(scope);

          // k3
          scope[depVar] = y + ky2 / 2; scope.v_ = v + kv2 / 2;
          const ky3 = h * (v + kv2 / 2);
          const kv3 = h * compiled.evaluate(scope);

          // k4
          scope[indVar] = x + h; scope[depVar] = y + ky3; scope.v_ = v + kv3;
          const ky4 = h * (v + ky3);
          const kv4 = h * compiled.evaluate(scope);

          y += (ky1 + 2 * ky2 + 2 * ky3 + ky4) / 6;
          v += (kv1 + 2 * kv2 + 2 * kv3 + kv4) / 6;
          x += h;

          if (!isFinite(y) || !isFinite(v) || Math.abs(y) > 1e15) break;

          xs.push(x);
          ys.push(y);
          dys.push(v);
        } catch (e) {
          if (i === 0) throw new Error('Evaluation error: ' + e.message);
          console.warn('RK4-2nd step error:', e.message);
          break;
        }
      }

      return { xs, ys, dys };
    },

    /**
     * Solve a system of ODEs.
     * eqs: [{ var: 'x', expr: 'a*x - b*x*y' }, { var: 'y', expr: 'd*x*y - g*y' }]
     * ic: { x: 10, y: 10 }
     */
    solveSystem(eqs, t0, tEnd, h, ic, constants) {
      const scope = { ...Object.fromEntries([...constants].map(([k, v]) => [k, v.value])) };
      const compiled = eqs.map(eq => ({ var: eq.var, fn: math.compile(eq.expr) }));
      const varNames = eqs.map(e => e.var);
      const n = varNames.length;

      // Initialize
      const ts = [t0];
      const data = {};
      for (const vn of varNames) {
        data[vn] = [ic[vn] || 0];
      }

      let t = t0;
      const vals = varNames.map(vn => ic[vn] || 0);
      const nSteps = Math.ceil((tEnd - t0) / h);

      for (let i = 0; i < nSteps; i++) {
        try {
          // Set current state
          scope.t = t;
          for (let j = 0; j < n; j++) scope[varNames[j]] = vals[j];

          // k1
          const k1 = compiled.map(c => h * c.fn.evaluate(scope));

          // k2
          scope.t = t + h / 2;
          for (let j = 0; j < n; j++) scope[varNames[j]] = vals[j] + k1[j] / 2;
          const k2 = compiled.map(c => h * c.fn.evaluate(scope));

          // k3
          for (let j = 0; j < n; j++) scope[varNames[j]] = vals[j] + k2[j] / 2;
          const k3 = compiled.map(c => h * c.fn.evaluate(scope));

          // k4
          scope.t = t + h;
          for (let j = 0; j < n; j++) scope[varNames[j]] = vals[j] + k3[j];
          const k4 = compiled.map(c => h * c.fn.evaluate(scope));

          // Update
          for (let j = 0; j < n; j++) {
            vals[j] += (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]) / 6;
          }
          t += h;

          // Stability check
          let overflow = false;
          for (let j = 0; j < n; j++) {
            if (!isFinite(vals[j]) || Math.abs(vals[j]) > 1e15) { overflow = true; break; }
          }
          if (overflow) break;

          ts.push(t);
          for (let j = 0; j < n; j++) data[varNames[j]].push(vals[j]);
        } catch (e) {
          if (i === 0) throw new Error('Evaluation error: ' + e.message);
          console.warn('RK4-system step error:', e.message);
          break;
        }
      }

      return { ts, data, varNames };
    },
  };

  /* ────────────────────────────
     7. SLOPE FIELD GENERATOR
     ──────────────────────────── */
  const SlopeField = {
    generate(rhsExpr, xRange, yRange, constants, gridSize = 20, indVar = 'x', depVar = 'y') {
      const scope = { ...Object.fromEntries([...constants].map(([k, v]) => [k, v.value])) };
      const compiled = math.compile(rhsExpr);

      const xStep = (xRange[1] - xRange[0]) / gridSize;
      const yStep = (yRange[1] - yRange[0]) / gridSize;
      const arrows = [];

      for (let i = 0; i <= gridSize; i++) {
        for (let j = 0; j <= gridSize; j++) {
          const x = xRange[0] + i * xStep;
          const y = yRange[0] + j * yStep;
          scope[indVar] = x; scope[depVar] = y;

          try {
            const slope = compiled.evaluate(scope);
            if (!isFinite(slope)) continue;

            const len = 0.3 * Math.min(xStep, yStep);
            const angle = Math.atan(slope);
            const dx = len * Math.cos(angle);
            const dy = len * Math.sin(angle);

            arrows.push({ x, y, dx, dy, slope });
          } catch {
            // skip
          }
        }
      }

      return arrows;
    },
  };

  /* ────────────────────────────
     8. GRAPHING (Plotly Wrappers)
     ──────────────────────────── */
  const Grapher = {
    plotlyLayout: {
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(10,14,30,0.3)',
      font: { family: 'Inter, sans-serif', color: '#8b95b0', size: 12 },
      margin: { l: 55, r: 20, t: 30, b: 45 },
      xaxis: {
        gridcolor: 'rgba(79,140,255,0.08)',
        zerolinecolor: 'rgba(79,140,255,0.2)',
        title: { font: { size: 13 } },
      },
      yaxis: {
        gridcolor: 'rgba(79,140,255,0.08)',
        zerolinecolor: 'rgba(79,140,255,0.2)',
        title: { font: { size: 13 } },
      },
      showlegend: true,
      legend: { font: { size: 11 }, bgcolor: 'rgba(0,0,0,0)', x: 1, xanchor: 'right', y: 1 },
    },

    plotlyConfig: {
      responsive: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    },

    /** Plot solution curve for single ODE */
    plotSolution(result, container) {
      if (result.system) {
        this.plotSystemSolution(result, container);
        return;
      }

      const traces = [{
        x: result.xs,
        y: result.ys,
        type: 'scatter',
        mode: 'lines',
        name: 'y(x)',
        line: { color: '#4f8cff', width: 2.5 },
      }];

      if (result.dys) {
        traces.push({
          x: result.xs,
          y: result.dys,
          type: 'scatter',
          mode: 'lines',
          name: "y'(x)",
          line: { color: '#00e5a0', width: 2, dash: 'dot' },
        });
      }

      const layout = {
        ...this.plotlyLayout,
        xaxis: { ...this.plotlyLayout.xaxis, title: 'x' },
        yaxis: { ...this.plotlyLayout.yaxis, title: 'y' },
      };

      Plotly.newPlot(container, traces, layout, this.plotlyConfig);
    },

    /** Plot system of ODEs — all variables vs t */
    plotSystemSolution(result, container) {
      const colors = ['#4f8cff', '#00e5a0', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4'];
      const traces = result.varNames.map((vn, i) => ({
        x: result.ts,
        y: result.data[vn],
        type: 'scatter',
        mode: 'lines',
        name: `${vn}(t)`,
        line: { color: colors[i % colors.length], width: 2.5 },
      }));

      const layout = {
        ...this.plotlyLayout,
        xaxis: { ...this.plotlyLayout.xaxis, title: 't' },
        yaxis: { ...this.plotlyLayout.yaxis, title: 'Value' },
      };

      Plotly.newPlot(container, traces, layout, this.plotlyConfig);
    },

    /** Plot slope field for first-order ODE */
    plotSlopeField(rhsExpr, solutionResult, constants, container, indVar = 'x', depVar = 'y') {
      const xs = solutionResult.xs || [];
      const ys = solutionResult.ys || [];
      const xMin = xs.length ? Math.min(...xs) : -5;
      const xMax = xs.length ? Math.max(...xs) : 5;
      const yMin = ys.length ? Math.min(...ys) - 2 : -5;
      const yMax = ys.length ? Math.max(...ys) + 2 : 5;

      const arrows = SlopeField.generate(rhsExpr, [xMin, xMax], [yMin, yMax], constants, 22, indVar, depVar);

      // Find min/max slope for color scaling
      let minSlope = Infinity;
      let maxSlope = -Infinity;
      arrows.forEach(a => {
        if (a.slope < minSlope) minSlope = a.slope;
        if (a.slope > maxSlope) maxSlope = a.slope;
      });

      function getSlopeColor(s) {
        // Clamp slope to avoid extreme outliers skewing the color scale
        const clampedS = Math.max(-10, Math.min(10, s));
        const t = (clampedS + 10) / 20; // map -10..10 to 0..1
        // HSL: 240 (blue/negative) to 0 (red/positive)
        const h = Math.round(240 - t * 240);
        return `hsla(${h}, 85%, 65%, 0.7)`;
      }

      const annotations = arrows.map(a => ({
        ax: a.x - a.dx / 2,
        ay: a.y - a.dy / 2,
        x: a.x + a.dx / 2,
        y: a.y + a.dy / 2,
        xref: 'x',
        yref: 'y',
        axref: 'x',
        ayref: 'y',
        showarrow: true,
        arrowhead: 0, // Use segments instead of arrows for cleaner look
        arrowsize: 1,
        arrowwidth: 1.5,
        arrowcolor: getSlopeColor(a.slope),
      }));

      const traces = [];
      if (xs.length) {
        traces.push({
          x: xs,
          y: ys,
          type: 'scatter',
          mode: 'lines',
          name: 'y(x)',
          line: { color: '#4f8cff', width: 2.5 },
        });
      }

      const layout = {
        ...this.plotlyLayout,
        annotations,
        xaxis: { ...this.plotlyLayout.xaxis, title: 'x', range: [xMin, xMax] },
        yaxis: { ...this.plotlyLayout.yaxis, title: 'y', range: [yMin, yMax] },
      };

      Plotly.newPlot(container, traces, layout, this.plotlyConfig);
    },

    /**
     * Plot phase portrait for systems.
     * Uses state.phaseAxes to pick which variables map to X, Y, Z.
     * Works for any number of dimensions.
     */
    plotPhasePortrait(result, container) {
      const vn = result.varNames;

      // Single ODE phase: y vs y'
      if (!result.system) {
        if (result.dys) {
          const traces = [{
            x: result.ys,
            y: result.dys,
            type: 'scatter',
            mode: 'lines',
            name: "y vs y'",
            line: { color: '#a855f7', width: 2 },
          }];
          const layout = {
            ...this.plotlyLayout,
            xaxis: { ...this.plotlyLayout.xaxis, title: 'y' },
            yaxis: { ...this.plotlyLayout.yaxis, title: "y'" },
          };
          Plotly.newPlot(container, traces, layout, this.plotlyConfig);
        }
        return;
      }

      // Clamp axis indices to valid range
      const ax = state.phaseAxes || { x: 0, y: 1, z: 2, color: 't' };
      const xi = Math.min(ax.x, vn.length - 1);
      const yi = Math.min(ax.y, vn.length - 1);
      const zi = Math.min(ax.z, vn.length - 1);
      const ci = ax.color;

      const xVar = vn[xi];
      const yVar = vn[yi];
      const zVar = vn[zi];
      
      let colorData;
      let colorTitle;
      if (ci === 't') {
        colorData = result.ts;
        colorTitle = 'Time';
      } else {
        const cIdx = Math.min(ci, vn.length - 1);
        colorData = result.data[vn[cIdx]];
        colorTitle = vn[cIdx];
      }
      
      const lineConfig = {
        color: colorData,
        colorscale: 'Viridis',
        width: 3,
        showscale: true,
        colorbar: { 
          title: colorTitle,
          thickness: 12,
          len: 0.6,
          outlinewidth: 0,
          tickfont: { size: 10, color: '#8b95b0' },
          titlefont: { size: 11, color: '#8b95b0' }
        }
      };

      // Decide 2D vs 3D based on how many unique axes are selected
      const uniqueAxes = new Set([xi, yi, zi]);
      const use3D = uniqueAxes.size >= 3 && vn.length >= 3;

      if (use3D) {
        const traces = [{
          x: result.data[xVar],
          y: result.data[yVar],
          z: result.data[zVar],
          type: 'scatter3d',
          mode: 'lines',
          name: `Phase: ${xVar}-${yVar}-${zVar}`,
          line: lineConfig,
        }];
        const layout = {
          ...this.plotlyLayout,
          scene: {
            xaxis: { title: xVar, gridcolor: 'rgba(79,140,255,0.1)', color: '#8b95b0' },
            yaxis: { title: yVar, gridcolor: 'rgba(79,140,255,0.1)', color: '#8b95b0' },
            zaxis: { title: zVar, gridcolor: 'rgba(79,140,255,0.1)', color: '#8b95b0' },
            bgcolor: 'rgba(10,14,30,0.3)',
          },
          margin: { l: 0, r: 0, t: 30, b: 0 },
        };
        Plotly.newPlot(container, traces, layout, this.plotlyConfig);
      } else {
        // 2D phase portrait
        const traces = [{
          x: result.data[xVar],
          y: result.data[yVar],
          type: 'scatter',
          mode: 'lines',
          name: `Phase: ${xVar} vs ${yVar}`,
          line: { ...lineConfig, width: 2 },
        }, {
          x: [result.data[xVar][0]],
          y: [result.data[yVar][0]],
          type: 'scatter',
          mode: 'markers',
          name: 'Start',
          marker: { color: '#00e5a0', size: 10, symbol: 'circle' },
        }];
        const layout = {
          ...this.plotlyLayout,
          xaxis: { ...this.plotlyLayout.xaxis, title: xVar },
          yaxis: { ...this.plotlyLayout.yaxis, title: yVar },
          margin: { l: 55, r: 70, t: 30, b: 45 }, // Extra right margin for colorbar
        };
        Plotly.newPlot(container, traces, layout, this.plotlyConfig);
      }
    },

    /**
     * Plot a pairwise projection grid for N-dimensional systems.
     * Shows every unique pair (i,j) as a small 2D phase plot.
     */
    plotProjections(result, container) {
      const vn = result.varNames;
      if (!result.system || vn.length < 2) return;

      const colors = ['#4f8cff', '#00e5a0', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

      // Build all unique pairs
      const pairs = [];
      for (let i = 0; i < vn.length; i++) {
        for (let j = i + 1; j < vn.length; j++) {
          pairs.push([i, j]);
        }
      }

      // Use Plotly subplots
      const cols = Math.min(pairs.length, 3);
      const rows = Math.ceil(pairs.length / cols);

      const traces = [];
      const layout = {
        ...this.plotlyLayout,
        showlegend: false,
        margin: { l: 40, r: 10, t: 30, b: 40 },
        grid: { rows, columns: cols, pattern: 'independent', xgap: 0.08, ygap: 0.12 },
      };

      pairs.forEach(([i, j], idx) => {
        const xaxis = idx === 0 ? 'x' : `x${idx + 1}`;
        const yaxis = idx === 0 ? 'y' : `y${idx + 1}`;

        traces.push({
          x: result.data[vn[i]],
          y: result.data[vn[j]],
          type: 'scatter',
          mode: 'lines',
          xaxis,
          yaxis,
          line: { color: colors[idx % colors.length], width: 1.5 },
          showlegend: false,
        });

        layout[`xaxis${idx === 0 ? '' : idx + 1}`] = {
          ...this.plotlyLayout.xaxis,
          title: { text: vn[i], font: { size: 11 } },
        };
        layout[`yaxis${idx === 0 ? '' : idx + 1}`] = {
          ...this.plotlyLayout.yaxis,
          title: { text: vn[j], font: { size: 11 } },
        };
      });

      Plotly.newPlot(container, traces, layout, this.plotlyConfig);
    },
  };

  /* ────────────────────────────
     9. UI CONTROLLER
     ──────────────────────────── */

  /** Render KaTeX in an element (safely waits for KaTeX to load) */
  function renderKaTeX(el, latex) {
    if (typeof katex === 'undefined') {
      // KaTeX not loaded yet — retry after a brief delay
      setTimeout(() => renderKaTeX(el, latex), 100);
      return;
    }
    try {
      katex.render(latex, el, { throwOnError: false, displayMode: true });
    } catch {
      el.textContent = latex;
    }
  }

  /** Show toast notification */
  function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  /** Build constants UI */
  function renderConstants() {
    DOM.constantsList.innerHTML = '';
    for (const [name, cfg] of state.constants) {
      const row = document.createElement('div');
      row.className = 'constant-row';
      row.innerHTML = `
        <span class="constant-row__name">${name}</span>
        <input type="range" min="${cfg.min}" max="${cfg.max}" step="${(cfg.max - cfg.min) / 200}"
               value="${cfg.value}" data-const="${name}" />
        <span class="constant-row__value">${Number(cfg.value).toFixed(2)}</span>
        <button class="btn btn-ghost btn-icon" data-remove="${name}" title="Remove ${name}"
                style="font-size: 0.8rem; color: var(--accent-error);">✕</button>
      `;
      DOM.constantsList.appendChild(row);

      // Slider live update
      const slider = row.querySelector('input[type="range"]');
      const valSpan = row.querySelector('.constant-row__value');
      slider.addEventListener('input', () => {
        const v = parseFloat(slider.value);
        cfg.value = v;
        valSpan.textContent = v.toFixed(2);
        // Live re-solve if we have a result
        if (state.lastResult) debouncedSolve();
      });

      // Remove button
      row.querySelector(`[data-remove="${name}"]`).addEventListener('click', () => {
        state.constants.delete(name);
        renderConstants();
      });
    }
  }

  /** Set mode (single / system) */
  function setMode(mode) {
    state.mode = mode;
    DOM.eqTypeTabs.querySelectorAll('.eq-type-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.mode === mode);
    });
    DOM.inputSingle.style.display = mode === 'single' ? '' : 'none';
    DOM.inputSystem.style.display = mode === 'system' ? '' : 'none';

    // Update IC grid for system mode
    if (mode === 'system') {
      updateSystemIC();
    }
  }

  /** Update initial conditions grid for system mode */
  function updateSystemIC() {
    const eqRows = DOM.systemEqs.querySelectorAll('.system-eq-row');
    const varNames = [];
    eqRows.forEach(row => {
      const label = row.querySelector('.system-eq-label').textContent;
      const match = label.match(/d(\w+)\/dt/);
      if (match) varNames.push(match[1]);
    });
    state.systemVars = varNames;

    // Build IC fields
    DOM.icGrid.innerHTML = '';

    // t0
    const t0Group = document.createElement('div');
    t0Group.className = 'input-group';
    t0Group.innerHTML = `<label for="ic-x0">t₀</label><input type="number" class="text-input" id="ic-x0" value="0" step="0.1" />`;
    DOM.icGrid.appendChild(t0Group);

    for (const vn of varNames) {
      const group = document.createElement('div');
      group.className = 'input-group';
      group.innerHTML = `<label for="ic-sys-${vn}">${vn}(t₀)</label><input type="number" class="text-input" id="ic-sys-${vn}" value="1" step="0.1" />`;
      DOM.icGrid.appendChild(group);
    }

    // tEnd
    const tEndGroup = document.createElement('div');
    tEndGroup.className = 'input-group';
    tEndGroup.innerHTML = `<label for="ic-xend">t_end</label><input type="number" class="text-input" id="ic-xend" value="30" step="1" />`;
    DOM.icGrid.appendChild(tEndGroup);
  }

  /** Load a preset */
  function loadPreset(key) {
    const preset = PRESETS[key];
    if (!preset) return;

    // Set mode
    setMode(preset.mode);

    // Set constants
    state.constants.clear();
    for (const [name, cfg] of Object.entries(preset.constants || {})) {
      state.constants.set(name, { ...cfg });
    }
    renderConstants();

    if (preset.mode === 'single') {
      DOM.eqInput.value = preset.equation;
      updateKatexPreview();
      DOM.icX0.value = preset.ic.x0;
      DOM.icY0.value = preset.ic.y0;
      DOM.icDY0.value = preset.ic.dy0 || 0;
      DOM.icXEnd.value = preset.ic.xEnd;
      DOM.icStep.value = preset.ic.step;
    } else {
      // Build system equations
      DOM.systemEqs.innerHTML = '';
      for (const eq of preset.equations) {
        addSystemEquation(eq.var, eq.expr);
      }

      // Set ICs
      updateSystemIC();
      setTimeout(() => {
        const x0Input = document.getElementById('ic-x0');
        const xEndInput = document.getElementById('ic-xend');
        if (x0Input) x0Input.value = preset.ic.x0;
        if (xEndInput) xEndInput.value = preset.ic.xEnd;

        for (const [vn, val] of Object.entries(preset.systemIC || {})) {
          const inp = document.getElementById(`ic-sys-${vn}`);
          if (inp) inp.value = val;
        }
      }, 50);

      DOM.icStep.value = preset.ic.step;
    }

    showToast(`Loaded preset: ${key.replace(/-/g, ' ')}`);
  }

  /** Auto-generate next variable name for system equations */
  function nextVarName() {
    const existingVars = [];
    DOM.systemEqs.querySelectorAll('.system-eq-label').forEach(l => {
      const m = l.textContent.match(/d(\w+)\/dt/);
      if (m) existingVars.push(m[1]);
    });
    const n = existingVars.length;
    // x, y, z for first 3, then x4, x5, x6... for higher dimensions
    if (n < 3) return ['x', 'y', 'z'][n];
    return `x${n + 1}`;
  }

  /** Add a system equation row */
  function addSystemEquation(varName = '', expr = '') {
    const row = document.createElement('div');
    row.className = 'system-eq-row';

    if (!varName) {
      varName = nextVarName();
    }

    row.innerHTML = `
      <span class="system-eq-label">d${varName}/dt =</span>
      <input type="text" class="eq-input" data-var="${varName}"
        placeholder="expression in ${varName}, t, and constants" value="${expr}" autocomplete="off" spellcheck="false" />
      <button class="btn btn-ghost btn-icon btn-remove-eq" title="Remove" style="font-size: 0.8rem; color: var(--accent-error);">✕</button>
    `;

    DOM.systemEqs.appendChild(row);

    row.querySelector('.btn-remove-eq').addEventListener('click', () => {
      if (DOM.systemEqs.children.length > 1) {
        row.remove();
        updateSystemIC();
      }
    });
  }

  /** Update KaTeX preview */
  function updateKatexPreview() {
    const eq = DOM.eqInput.value.trim();
    if (!eq) {
      DOM.katexPreview.innerHTML = '';
      return;
    }
    const latex = Parser.toLatex(eq);
    renderKaTeX(DOM.katexPreview, latex);
  }

  /** Display solution steps */
  function displaySolution(result) {
    DOM.cardSolution.style.display = '';

    // Type badge
    if (result.typeName) {
      DOM.solutionBadge.innerHTML = `<span class="type-badge">📋 ${result.typeName}</span>`;
    } else {
      DOM.solutionBadge.innerHTML = '';
    }

    // Steps
    DOM.solutionSteps.innerHTML = '';

    if (result.symbolicSteps) {
      for (const step of result.symbolicSteps) {
        const div = document.createElement('div');
        div.className = `solution-step${step.highlight ? ' solution-step--highlight' : ''}`;
        div.innerHTML = `
          <div class="solution-step__label">${step.label}</div>
          <div class="solution-step__content" id="step-${Math.random().toString(36).slice(2)}"></div>
        `;
        DOM.solutionSteps.appendChild(div);
        const contentEl = div.querySelector('.solution-step__content');
        renderKaTeX(contentEl, step.latex);
      }
    }

    // Always show numerical info
    if (result.xs && result.xs.length > 1) {
      const numStep = document.createElement('div');
      numStep.className = 'solution-step';
      numStep.innerHTML = `
        <div class="solution-step__label">Numerical Solution (RK4)</div>
        <div class="solution-step__content" style="font-size: 0.82rem; color: var(--text-secondary);">
          Computed ${result.xs.length.toLocaleString()} points from x = ${result.xs[0].toFixed(2)} to ${result.xs[result.xs.length - 1].toFixed(2)}<br/>
          y(${result.xs[0].toFixed(2)}) = ${result.ys[0].toFixed(4)},&nbsp;
          y(${result.xs[result.xs.length - 1].toFixed(2)}) = ${result.ys[result.ys.length - 1].toFixed(4)}
        </div>
      `;
      DOM.solutionSteps.appendChild(numStep);
    }

    if (result.system && result.ts && result.ts.length > 1) {
      const numStep = document.createElement('div');
      numStep.className = 'solution-step';
      let info = `Computed ${result.ts.length.toLocaleString()} points from t = ${result.ts[0].toFixed(2)} to ${result.ts[result.ts.length - 1].toFixed(2)}<br/>`;
      for (const vn of result.varNames) {
        const d = result.data[vn];
        info += `${vn}(t₀) = ${d[0].toFixed(4)},&nbsp; ${vn}(t_end) = ${d[d.length - 1].toFixed(4)}<br/>`;
      }
      numStep.innerHTML = `
        <div class="solution-step__label">Numerical Solution (RK4 System)</div>
        <div class="solution-step__content" style="font-size: 0.82rem; color: var(--text-secondary);">${info}</div>
      `;
      DOM.solutionSteps.appendChild(numStep);
    }
  }

  /** Get graph container (create if needed) */
  function getPlotContainer() {
    let el = document.getElementById('plot-container');
    if (!el) {
      el = document.createElement('div');
      el.id = 'plot-container';
      el.style.width = '100%';
      el.style.minHeight = '400px';
      DOM.plotArea.innerHTML = '';
      DOM.plotArea.appendChild(el);
    }
    return el;
  }

  /** Build axis selector dropdowns for phase portrait (for N-dim systems) */
  function buildPhaseAxisSelectors(varNames) {
    let container = document.getElementById('phase-axis-selectors');
    if (!container) {
      container = document.createElement('div');
      container.id = 'phase-axis-selectors';
      container.style.cssText = 'display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap; align-items:center;';
      DOM.plotArea.parentElement.insertBefore(container, DOM.plotArea);
    }

    // Only show for systems with 3+ variables
    if (!varNames || varNames.length < 3) {
      container.style.display = 'none';
      return;
    }

    const isPhaseTab = state.activeGraph === 'phase';
    container.style.display = isPhaseTab ? 'flex' : 'none';
    if (!isPhaseTab) return;

    const axes = ['x', 'y', 'z', 'color'];
    const labels = ['X axis', 'Y axis', 'Z axis', 'Color (4D)'];

    container.innerHTML = `<span style="font-size:0.72rem; color:var(--text-muted); font-weight:600; text-transform:uppercase; letter-spacing:0.06em;">Axes:</span>`;

    axes.forEach((ax, i) => {
      const select = document.createElement('select');
      select.className = 'select-input';
      select.style.cssText = 'width:auto; min-width:80px; font-size:0.78rem; padding:4px 8px;';
      select.dataset.axis = ax;
      select.title = labels[i];
      
      // For color, add a Time option first
      if (ax === 'color') {
        const optT = document.createElement('option');
        optT.value = 't';
        optT.textContent = 'Time (t)';
        optT.selected = state.phaseAxes[ax] === 't';
        select.appendChild(optT);
      }

      varNames.forEach((vn, vi) => {
        const opt = document.createElement('option');
        opt.value = vi;
        opt.textContent = vn;
        opt.selected = state.phaseAxes[ax] === vi;
        select.appendChild(opt);
      });

      select.addEventListener('change', () => {
        state.phaseAxes[ax] = select.value === 't' ? 't' : parseInt(select.value);
        if (state.lastResult) renderGraph(state.lastResult);
      });

      const label = document.createElement('span');
      label.style.cssText = 'font-size:0.7rem; color:var(--text-secondary);';
      label.textContent = labels[i] + ':';

      container.appendChild(label);
      container.appendChild(select);
    });
  }

  /** Render active graph */
  function renderGraph(result) {
    const container = getPlotContainer();

    // Build axis selectors for systems
    if (result.system) {
      buildPhaseAxisSelectors(result.varNames);
    } else {
      const sel = document.getElementById('phase-axis-selectors');
      if (sel) sel.style.display = 'none';
    }

    switch (state.activeGraph) {
      case 'solution':
        Grapher.plotSolution(result, container);
        break;
      case 'slope':
        if (result.rhsExpr && !result.system) {
          Grapher.plotSlopeField(result.rhsExpr, result, state.constants, container, result.indVar, result.depVar);
        } else if (result.system) {
          showToast('Slope fields are only available for single first-order ODEs', 'error');
          Grapher.plotSolution(result, container);
        }
        break;
      case 'phase':
        if (result.system) {
          Grapher.plotPhasePortrait(result, container);
        } else if (result.dys) {
          Grapher.plotPhasePortrait(result, container);
        } else {
          showToast('Phase portraits require a 2nd-order ODE or a system', 'error');
          Grapher.plotSolution(result, container);
        }
        break;
      case 'projections':
        if (result.system && result.varNames.length >= 2) {
          Grapher.plotProjections(result, container);
        } else {
          showToast('Projections require a system with 2+ variables', 'error');
          Grapher.plotSolution(result, container);
        }
        break;
    }
  }

  /* ────────────────────────────
     10. MAIN SOLVE FUNCTION
     ──────────────────────────── */
  function solve() {
    DOM.btnSolve.classList.add('solving');

    try {
      let result;

      if (state.mode === 'single') {
        result = solveSingle();
      } else {
        result = solveSystem();
      }

      if (!result) {
        DOM.btnSolve.classList.remove('solving');
        return;
      }

      state.lastResult = result;

      // Display solution & graph
      displaySolution(result);
      renderGraph(result);

      showToast('Equation solved successfully!');
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
      console.error('Solve error:', err);
    }

    setTimeout(() => DOM.btnSolve.classList.remove('solving'), 600);
  }

  function solveSingle() {
    const eqStr = DOM.eqInput.value.trim();
    if (!eqStr) {
      showToast('Please enter an equation', 'error');
      return null;
    }

    const parsed = Parser.parse(eqStr);
    console.log('Parsed equation:', parsed);

    const x0 = parseFloat(DOM.icX0.value) || 0;
    const y0 = parseFloat(DOM.icY0.value) || 1;
    const dy0 = parseFloat(DOM.icDY0.value) || 0;
    const xEnd = parseFloat(DOM.icXEnd.value) || 10;
    const h = parseFloat(DOM.icStep.value) || 0.01;

    let result = { typeName: '', symbolicSteps: null, rhsExpr: null, system: false };

    // Try symbolic first
    const symbolic = SymbolicSolver.solve(parsed, state.constants);
    if (symbolic.success) {
      result.typeName = symbolic.type;
      result.symbolicSteps = symbolic.steps;
    }

    // Always compute numerical
    if (parsed.order === 1) {
      result.typeName = result.typeName || '1st-Order ODE';
      const rhsExpr = cleanRhsForMathJs(parsed.rhs);
      console.log('RHS for math.js:', rhsExpr);
      result.rhsExpr = rhsExpr;
      result.indVar = parsed.indVar || 'x';
      result.depVar = parsed.depVar || 'y';
      const numResult = NumericalSolver.solveFirstOrder(rhsExpr, x0, y0, xEnd, h, state.constants, result.indVar, result.depVar);
      result.xs = numResult.xs;
      result.ys = numResult.ys;
    } else if (parsed.order === 2) {
      result.typeName = result.typeName || '2nd-Order ODE';
      const rhsExpr = cleanRhsForMathJs(parsed.rhs);
      console.log('RHS for math.js (2nd order):', rhsExpr);
      result.rhsExpr = rhsExpr;
      result.indVar = parsed.indVar || 'x';
      result.depVar = parsed.depVar || 'y';
      const numResult = NumericalSolver.solveSecondOrder(rhsExpr, x0, y0, dy0, xEnd, h, state.constants, result.indVar, result.depVar);
      result.xs = numResult.xs;
      result.ys = numResult.ys;
      result.dys = numResult.dys;
    }

    return result;
  }

  function solveSystem() {
    const eqRows = DOM.systemEqs.querySelectorAll('.system-eq-row');
    const eqs = [];
    eqRows.forEach(row => {
      const input = row.querySelector('.eq-input');
      const label = row.querySelector('.system-eq-label').textContent;
      const match = label.match(/d(\w+)\/dt/);
      if (match && input.value.trim()) {
        eqs.push({ var: match[1], expr: input.value.trim() });
      }
    });

    if (eqs.length === 0) {
      showToast('Please enter at least one equation', 'error');
      return null;
    }

    const t0 = parseFloat(document.getElementById('ic-x0')?.value) || 0;
    const tEnd = parseFloat(document.getElementById('ic-xend')?.value) || 30;
    const h = parseFloat(DOM.icStep.value) || 0.01;

    // Collect system ICs
    const ic = {};
    for (const eq of eqs) {
      const inp = document.getElementById(`ic-sys-${eq.var}`);
      ic[eq.var] = inp ? parseFloat(inp.value) || 0 : 1;
    }

    const sysResult = NumericalSolver.solveSystem(eqs, t0, tEnd, h, ic, state.constants);

    return {
      typeName: `System of ${eqs.length} ODEs`,
      system: true,
      ts: sysResult.ts,
      data: sysResult.data,
      varNames: sysResult.varNames,
    };
  }

  /** Clean up RHS expression for math.js evaluation */
  function cleanRhsForMathJs(rhs) {
    if (!rhs) return '0';
    let s = rhs;
    // Handle implicit multiplication: 2y → 2*y
    s = s.replace(/(\d)([a-zA-Z])/g, '$1*$2');
    // Handle letter-letter implicit mult where it makes sense
    // e.g., "xy" → "x*y", but NOT "sin", "cos", "exp" etc.
    const mathFuncs = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh',
                       'exp', 'log', 'ln', 'sqrt', 'abs', 'ceil', 'floor', 'round',
                       'yp', 'ypp'];
    // Don't break known multi-letter identifiers
    s = s.replace(/([a-zA-Z])(\()/g, '$1$2'); // keep func(
    // Handle y² → y^2 and y³ → y^3
    s = s.replace(/²/g, '^2');
    s = s.replace(/³/g, '^3');
    return s;
  }

  /** Debounced solve for slider interactions */
  let solveTimeout = null;
  function debouncedSolve() {
    clearTimeout(solveTimeout);
    solveTimeout = setTimeout(solve, 120);
  }

  /* ────────────────────────────
     11. EVENT WIRING
     ──────────────────────────── */
  function init() {
    // Equation input → KaTeX preview
    DOM.eqInput.addEventListener('input', updateKatexPreview);

    // Mode tabs
    DOM.eqTypeTabs.addEventListener('click', (e) => {
      const tab = e.target.closest('.eq-type-tab');
      if (tab) setMode(tab.dataset.mode);
    });

    // Presets
    DOM.presetSelect.addEventListener('change', () => {
      if (DOM.presetSelect.value) loadPreset(DOM.presetSelect.value);
    });

    // Solve
    DOM.btnSolve.addEventListener('click', solve);

    // Enter key to solve
    DOM.eqInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') solve();
    });

    // Add constant
    DOM.btnAddConst.addEventListener('click', () => {
      const name = DOM.newConstName.value.trim();
      const value = parseFloat(DOM.newConstValue.value) || 1;
      if (!name) return;
      state.constants.set(name, { value, min: Math.min(-10, value - 10), max: Math.max(10, value + 10) });
      DOM.newConstName.value = '';
      DOM.newConstValue.value = '1';
      renderConstants();
    });

    DOM.newConstName.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') DOM.btnAddConst.click();
    });

    // Add system equation
    DOM.btnAddEq.addEventListener('click', () => {
      addSystemEquation();
      updateSystemIC();
    });

    // Graph tabs
    DOM.graphTabs.addEventListener('click', (e) => {
      const tab = e.target.closest('.graph-tab');
      if (!tab) return;
      DOM.graphTabs.querySelectorAll('.graph-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.activeGraph = tab.dataset.graph;
      if (state.lastResult) renderGraph(state.lastResult);
    });

    // Help button
    DOM.btnHelp.addEventListener('click', () => {
      showToast('Try a preset from the dropdown, or enter your own equation!');
    });

    // Window resize → replot
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (state.lastResult) {
          const container = document.getElementById('plot-container');
          if (container) Plotly.Plots.resize(container);
        }
      }, 200);
    });
  }

  // Boot — wait for all libraries to be available
  function boot() {
    if (typeof math === 'undefined' || typeof Plotly === 'undefined') {
      setTimeout(boot, 50);
      return;
    }
    init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
