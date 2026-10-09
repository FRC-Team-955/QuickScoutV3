import { Construction } from "lucide-react";

export default function Todo({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="todo">
      <Construction size={20} />
      <div>
        <strong>TODO · {title}</strong>
        <p>{children}</p>
      </div>
    </div>
  );
}
