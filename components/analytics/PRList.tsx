// Personal Records list — top exercises by best weight lifted.
interface Props {
  prs: [string, number][];
}

export default function PRList({ prs }: Props) {
  const maxWeight = prs[0]?.[1] ?? 1;

  return (
    <div className="space-y-3">
      {prs.map(([name, weight]) => (
        <div key={name}>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium truncate mr-2">{name}</span>
            <span className="shrink-0 text-orange-400 font-semibold">{weight} lbs</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-800">
            <div
              className="h-1.5 rounded-full bg-orange-500"
              style={{ width: `${(weight / maxWeight) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
