type Props = {
  aliases: string;
};

export default function Aliases({ aliases }: Props) {
  return (
    <div style={{ fontStyle: "italic" }}>
      Aliases:{" "}
      {aliases
        .split(",")
        .map((t) => <code>{t.trim()}</code>)
        .reduce((prev, curr) => [prev, ", ", curr])}
    </div>
  );
}
