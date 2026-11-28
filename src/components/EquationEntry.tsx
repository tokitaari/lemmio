import { useId, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { SIMPLIFY_LABEL, SWAP_SYMBOL } from '../math'

/** The three fields of the equation practice. */
export type EquationField = 'operation' | 'equation' | 'set'

export type EquationFields = Record<EquationField, string>

interface Key {
  /** Text inserted at the caret, or the new content of the field if `replace` is set. */
  text: string
  /** What the key shows if that differs from `text`. */
  display?: string
  /** Accessible name for symbols that screen readers would read badly. */
  label?: string
  /** Replaces the whole field: for keys that are a complete entry on their own. */
  replace?: boolean
  /** Puts the caret this many characters before the end of `text`, e.g. 1 to land inside `{}`. */
  caretBack?: number
  /** Takes two columns of the key grid. */
  wide?: boolean
}

const COMMA_KEY: Key = { text: ',', label: 'Komma' }

function operationKeys(variable: string): readonly Key[] {
  return [
    { text: '|', label: 'Strich' },
    { text: '+', label: 'Plus' },
    { text: '−', label: 'Minus' },
    { text: '·', label: 'Malpunkt' },
    { text: ':', label: 'Geteilt durch' },
    { text: variable },
    { text: '(', label: 'Klammer auf' },
    { text: ')', label: 'Klammer zu' },
    { text: `| ${SIMPLIFY_LABEL}`, display: SIMPLIFY_LABEL, replace: true, wide: true },
    { text: `| ${SWAP_SYMBOL}`, display: SWAP_SYMBOL, label: 'Seiten tauschen', replace: true },
  ]
}

function equationKeys(variable: string): readonly Key[] {
  return [
    { text: variable },
    { text: '=', label: 'Gleichheitszeichen' },
    { text: '(', label: 'Klammer auf' },
    { text: ')', label: 'Klammer zu' },
    { text: '+', label: 'Plus' },
    { text: '−', label: 'Minus' },
    { text: '·', label: 'Malpunkt' },
    { text: ':', label: 'Geteilt durch' },
  ]
}

const SET_KEYS: readonly Key[] = [
  { text: 'L = {}', display: 'L = {…}', label: 'Lösungsmenge mit einer Zahl', replace: true, caretBack: 1, wide: true },
  { text: 'L = { }', display: '{ }', label: 'Leere Menge', replace: true },
  { text: 'L = ℚ', display: 'ℚ', label: 'Alle rationalen Zahlen', replace: true },
  { text: '−', label: 'Minus' },
]

const FIELD_NAMES: Record<EquationField, string> = {
  operation: 'Umformung',
  equation: 'Neue Zeile',
  set: 'Lösungsmenge',
}

interface EquationEntryProps {
  /** The variable to solve for; it gets its own key. */
  variable: string
  values: EquationFields
  onChange: (field: EquationField, value: string) => void
  onSubmitLine: () => void
  /** Without this (and `setRef`) the field "Lösungsmenge" is left out, e.g. when the result is asked for elsewhere. */
  onSubmitSolutionSet?: () => void
  onReveal: () => void
  operationRef: RefObject<HTMLInputElement | null>
  equationRef: RefObject<HTMLInputElement | null>
  setRef?: RefObject<HTMLInputElement | null>
  /** Adds a comma key to the fields "Umformung" and "Neue Zeile", for decimal numbers. */
  decimalKey?: boolean
}

/**
 * Input of the equation practice: the operation written next to the line
 * before ("| − 3x", "Term umformen", "⇄"), the new line, and the solution set.
 * One row of math keys serves the field that has the focus; keys insert at the
 * caret and keep the focus in the field, so the on-screen keyboard stays open.
 */
export default function EquationEntry({
  variable,
  values,
  onChange,
  onSubmitLine,
  onSubmitSolutionSet,
  onReveal,
  operationRef,
  equationRef,
  setRef,
  decimalKey = false,
}: EquationEntryProps) {
  const [active, setActive] = useState<EquationField>('operation')
  // Caret position to restore after React has written the new value.
  const caret = useRef<{ field: EquationField; position: number } | null>(null)
  const ids = useId()
  const hintId = `${ids}-hint`

  useLayoutEffect(() => {
    const target = caret.current
    if (!target) return
    const input =
      target.field === 'operation' ? operationRef.current : target.field === 'equation' ? equationRef.current : setRef?.current
    if (!input) return
    caret.current = null
    input.focus()
    input.setSelectionRange(target.position, target.position)
  }, [values, operationRef, equationRef, setRef])

  const inputOf = (field: EquationField) =>
    field === 'operation' ? operationRef.current : field === 'equation' ? equationRef.current : setRef?.current

  /** Writes `next` into the active field and puts the caret at `position`. */
  const write = (next: string, position: number) => {
    const input = inputOf(active)
    if (next === values[active]) {
      input?.focus()
      input?.setSelectionRange(position, position)
      return
    }
    caret.current = { field: active, position }
    onChange(active, next)
  }

  const press = (key: Key) => {
    if (key.replace) {
      write(key.text, key.text.length - (key.caretBack ?? 0))
      return
    }
    const value = values[active]
    const input = inputOf(active)
    const start = input?.selectionStart ?? value.length
    const end = input?.selectionEnd ?? start
    write(value.slice(0, start) + key.text + value.slice(end), start + key.text.length)
  }

  const backspace = () => {
    const value = values[active]
    const input = inputOf(active)
    const start = input?.selectionStart ?? value.length
    const end = input?.selectionEnd ?? start
    const from = start === end ? Math.max(0, start - 1) : start
    write(value.slice(0, from) + value.slice(end), from)
  }

  const base = active === 'operation' ? operationKeys(variable) : active === 'equation' ? equationKeys(variable) : SET_KEYS
  const keys = decimalKey && active !== 'set' ? [...base, COMMA_KEY] : base

  return (
    <div className="equation-entry">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSubmitLine()
        }}
        noValidate
      >
        <Field
          id={`${ids}-operation`}
          label={FIELD_NAMES.operation}
          placeholder="z. B. | − 3x"
          value={values.operation}
          onChange={(value) => onChange('operation', value)}
          onFocus={() => setActive('operation')}
          inputRef={operationRef}
          describedBy={hintId}
        />
        <Field
          id={`${ids}-equation`}
          label={FIELD_NAMES.equation}
          placeholder="z. B. 2x + 2 = 8"
          value={values.equation}
          onChange={(value) => onChange('equation', value)}
          onFocus={() => setActive('equation')}
          inputRef={equationRef}
          describedBy={hintId}
        />
        <p id={hintId} className="practice-hint">
          Schreibe zuerst die Umformung, die du auf beide Seiten anwendest (z. B. | − 3x oder | : 2), und dann die neue
          Zeile. „{SIMPLIFY_LABEL}“ fasst jede Seite nur zusammen, „{SWAP_SYMBOL}“ tauscht die Seiten.
        </p>
        <div className="practice-actions">
          <button type="submit" className="btn btn-primary">
            Zeile prüfen
          </button>
        </div>
      </form>

      {onSubmitSolutionSet && setRef && (
        <form
          className="equation-set"
          onSubmit={(e) => {
            e.preventDefault()
            onSubmitSolutionSet()
          }}
          noValidate
        >
          <Field
            id={`${ids}-set`}
            label={FIELD_NAMES.set}
            placeholder="z. B. L = {3}"
            value={values.set}
            onChange={(value) => onChange('set', value)}
            onFocus={() => setActive('set')}
            inputRef={setRef}
          />
          <div className="practice-actions">
            <button type="submit" className="btn btn-primary">
              Lösungsmenge prüfen
            </button>
          </div>
        </form>
      )}

      <div className="math-keys" role="group" aria-label="Mathe-Tasten">
        {keys.map((key) => (
          <button
            key={key.text}
            type="button"
            className={key.wide ? 'math-key math-key-wide' : 'math-key'}
            aria-label={key.label}
            // Keeps the focus (and on phones the keyboard) in the field.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => press(key)}
          >
            {key.display ?? key.text}
          </button>
        ))}
        <button
          type="button"
          className="math-key"
          aria-label="Letztes Zeichen löschen"
          onMouseDown={(e) => e.preventDefault()}
          onClick={backspace}
        >
          ⌫
        </button>
      </div>
      <p className="practice-hint">Die Tasten gelten für das Feld „{FIELD_NAMES[active]}“.</p>

      <div className="practice-actions">
        <button type="button" className="btn btn-secondary" onClick={onReveal}>
          Lösung anzeigen
        </button>
      </div>
    </div>
  )
}

interface FieldProps {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  onFocus: () => void
  inputRef: RefObject<HTMLInputElement | null>
  describedBy?: string
}

function Field({ id, label, placeholder, value, onChange, onFocus, inputRef, describedBy }: FieldProps) {
  return (
    <div className="equation-field">
      <label htmlFor={id} className="practice-label">
        {label}
      </label>
      <input
        ref={inputRef}
        id={id}
        className="math-input"
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        aria-describedby={describedBy}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        enterKeyHint="go"
      />
    </div>
  )
}
