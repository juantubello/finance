import { useState } from "react";
import ExpenseModal from "@/components/ExpenseModal";
import { useNavigate } from "react-router-dom";

export default function AddExpense() {
  const [open] = useState(true);
  const navigate = useNavigate();

  return (
    <ExpenseModal
      open={open}
      onClose={() => navigate("/")}
    />
  );
}
