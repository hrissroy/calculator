"use strict";

const displayEl = document.getElementById("display");
const expressionEl = document.getElementById("expression");
const clearBtn = document.querySelector('[data-action="clear"]');
const operatorBtns = document.querySelectorAll('[data-action="operator"]');

const ERROR_TEXT = "Can't divide by zero";
const MAX_DIGITS = 12;
const SYMBOLS = { "+": "+", "-": "−", "*": "×", "/": "÷" };

let current = "0";          // number being typed / shown (string)
let previous = null;        // first operand (number)
let operator = null;        // + - * /
let waiting = false;        // true right after an operator or "="
let error = false;          // true after division by zero
let expressionText = "";    // text shown on the upper line

/* ---------- Display module ---------- */

function roundResult(n) {
    return Number(n.toPrecision(12));   // avoids 0.1 + 0.2 = 0.30000000000000004
}

function formatString(str) {
    const n = Number(str);
    if (!Number.isFinite(n)) return "Error";

    // very large / very small values -> scientific notation
    if (n !== 0 && (Math.abs(n) >= 1e15 || Math.abs(n) < 1e-9)) {
        return n.toExponential();
    }
    // results JS stored as e.g. "1e-7" -> normal decimal text
    if (/e/i.test(str)) {
        return n.toLocaleString("en-US", { maximumFractionDigits: 20 });
    }

    // typed text: add comma separators, keep a trailing "." while typing
    const negative = str.startsWith("-");
    const body = negative ? str.slice(1) : str;
    const [intPart, fracPart] = body.split(".");
    const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return (negative ? "-" : "") + withCommas + (fracPart !== undefined ? "." + fracPart : "");
}

function fmt(n) {
    return formatString(String(n));
}

function render() {
    const text = error ? ERROR_TEXT : formatString(current);
    displayEl.textContent = text;
    displayEl.classList.toggle("error", error);
    displayEl.style.fontSize = !error && text.length > 18 ? "20px"
                             : !error && text.length > 13 ? "26px" : "";
    expressionEl.textContent = expressionText;

    // AC while idle, C while a number is being typed
    clearBtn.textContent = (!waiting && !error && current !== "0") ? "C" : "AC";

    // highlight the selected operator
    operatorBtns.forEach(btn => {
        btn.classList.toggle("active", waiting && operator === btn.dataset.value);
    });
}

/* ---------- Calculation logic module ---------- */

function calculate(a, b, op) {
    if (op === "+") return a + b;
    if (op === "-") return a - b;
    if (op === "*") return a * b;
    if (op === "/") return b === 0 ? null : a / b;
    return b;
}

function showDivideByZero(exprText) {
    error = true;
    current = "0";
    previous = null;
    operator = null;
    waiting = false;
    expressionText = exprText;
    render();
}

function chooseOperator(nextOperator) {
    if (resetIfError()) return;
    const input = Number(current);

    if (operator && waiting) {
        operator = nextOperator;                       // just change the operator
    } else if (operator === null) {
        previous = input;                              // first operand
        operator = nextOperator;
    } else {                                           // chained calculation
        const result = calculate(previous, input, operator);
        if (result === null) {
            showDivideByZero(`${fmt(previous)} ${SYMBOLS[operator]} ${fmt(input)} =`);
            return;
        }
        previous = roundResult(result);
        current = String(previous);
        operator = nextOperator;
    }

    waiting = true;
    expressionText = `${fmt(previous)} ${SYMBOLS[operator]}`;
    render();
}

function equals() {
    if (resetIfError()) return;
    if (operator === null) return;

    const b = Number(current);
    const exprText = `${fmt(previous)} ${SYMBOLS[operator]} ${fmt(b)} =`;
    const result = calculate(previous, b, operator);

    if (result === null) {
        showDivideByZero(exprText);
        return;
    }

    current = String(roundResult(result));
    expressionText = exprText;
    previous = null;
    operator = null;
    waiting = true;
    render();
}

/* ---------- Keypad and input module ---------- */

function resetIfError() {
    if (error) {
        clearAll();
        return true;
    }
    return false;
}

function inputDigit(digit) {
    if (error) clearAll();               // next key press resets, then continues

    if (waiting) {
        current = digit;
        waiting = false;
    } else if (current === "0") {
        current = digit;
    } else if (current.replace(/[-.]/g, "").length < MAX_DIGITS) {
        current += digit;
    }
    render();
}

function inputDecimal() {
    if (error) clearAll();

    if (waiting) {
        current = "0.";
        waiting = false;
    } else if (!current.includes(".")) {
        current += ".";
    }
    render();
}

/* ---------- Special functions and error handling module ---------- */

function clearAll() {
    current = "0";
    previous = null;
    operator = null;
    waiting = false;
    error = false;
    expressionText = "";
    render();
}

function clearOrAll() {
    // C clears only the current entry; AC clears everything
    if (!error && !waiting && current !== "0") {
        current = "0";
        render();
    } else {
        clearAll();
    }
}

function toggleSign() {
    if (resetIfError()) return;
    if (waiting) {
        current = String(-Number(current));
        waiting = false;
    } else if (current !== "0") {
        current = current.startsWith("-") ? current.slice(1) : "-" + current;
    }
    render();
}

function percent() {
    if (resetIfError()) return;
    const value = Number(current);

    // 2000 + 18%  ->  18% of 2000 = 360
    if (operator && previous !== null && (operator === "+" || operator === "-")) {
        current = String(roundResult(previous * value / 100));
    } else {
        current = String(roundResult(value / 100));
    }
    waiting = false;
    render();
}

function backspace() {
    if (resetIfError()) return;
    if (waiting) return;
    current = current.length > 1 && current !== "-0" ? current.slice(0, -1) : "0";
    if (current === "-") current = "0";
    render();
}

/* ---------- Events ---------- */

document.querySelectorAll(".keypad button").forEach(button => {
    button.addEventListener("click", () => {
        const value = button.dataset.value;
        const action = button.dataset.action;

        if (action === "operator") chooseOperator(value);
        else if (value !== undefined) inputDigit(value);
        else if (action === "decimal") inputDecimal();
        else if (action === "equals") equals();
        else if (action === "clear") clearOrAll();
        else if (action === "sign") toggleSign();
        else if (action === "percent") percent();
        else if (action === "backspace") backspace();

        button.blur();   // stops Enter from re-pressing the focused button
    });
});

document.addEventListener("keydown", event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key;

    if (/^[0-9]$/.test(key)) inputDigit(key);
    else if (key === ".") inputDecimal();
    else if (["+", "-", "*", "/"].includes(key)) { event.preventDefault(); chooseOperator(key); }
    else if (key === "Enter" || key === "=") { event.preventDefault(); equals(); }
    else if (key === "%") percent();
    else if (key === "Backspace") backspace();
    else if (key === "Escape" || key === "Delete") clearAll();
});

render();
