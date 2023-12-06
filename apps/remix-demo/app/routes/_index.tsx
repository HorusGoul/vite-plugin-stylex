import type { MetaFunction } from "@remix-run/node";
import Card from "~/Card";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export default function Index() {
  return <Card>Remix App with StyleX!</Card>;
}
