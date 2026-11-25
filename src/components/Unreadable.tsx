import InputEcho from './InputEcho'

/** Feedback for an input that cannot be read: the message and the input with the error position marked. */
export default function Unreadable({
  what,
  error,
  input,
}: {
  what: string
  error: { message: string; position: number; length: number }
  input: string
}) {
  return (
    <div className="feedback feedback-invalid">
      <p>
        {what} kann ich nicht lesen. {error.message}
      </p>
      {input.trim() !== '' && <InputEcho input={input} position={error.position} length={error.length} />}
    </div>
  )
}
