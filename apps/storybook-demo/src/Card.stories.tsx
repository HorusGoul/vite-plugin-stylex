import type { Meta, StoryObj } from "@storybook/react";

import Card from "./Card";

const meta = {
  title: "Demo/Card",
  component: Card,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    children: {},
  },
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: {
    children: "Storybook App with StyleX!",
  },
};
