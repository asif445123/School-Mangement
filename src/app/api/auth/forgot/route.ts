import { fail } from "@/lib/auth";

// Replaced by the email reset link (/forgot-password)
export async function POST() {
  return fail("Please use the Forgot password link on the login page: we email you a reset link.", 410);
}
