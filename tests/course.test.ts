import { expect, it } from "vitest";
import { detectCourse } from "@/lib/parser";

it("keeps numbers in course names", () => {
  expect(detectCourse("HIST 1311 - History of the United States to 1865\nFall 2026")).toEqual({ code: "HIST 1311", name: "History of the United States to 1865" });
  expect(detectCourse("MATH 3330 Linear Algebra\nFall 2026").name).toBe("Linear Algebra");
});
