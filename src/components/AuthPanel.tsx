import { useState } from "react";
import { Button } from "./ui/button";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase";

export default function AuthPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function createAccount() {
    const address = email.trim().toLowerCase();

    if (!address.endsWith("@student.csd509j.net")) {
        setMessage("Use your school email.");
        return;
    }

    setBusy(true);
    setMessage("");

    try {
        await createUserWithEmailAndPassword(auth, address, password);
    } catch (error) {
        setMessage(error instanceof Error ? error.message : String(error));
    } finally {
        setBusy(false);
    }
    }


    async function signIn() {
    setBusy(true);
    setMessage("");

    try {
        await signInWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password
        );
    } catch (error) {
        setMessage(error instanceof Error ? error.message : String(error));
    } finally {
        setBusy(false);
    }
    }

    

  return (
    <section className="mx-auto max-w-sm p-6 space-y-3">
      <h3>Create your scout account</h3>

      <label className="block">
        School email
        <input
          className="field"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>

      <label className="block">
        QuickScout password
        <input
          className="field"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>


<div className="flex flex-wrap gap-3">
      <Button
    type="button"
    disabled={busy}
    onClick={() => void createAccount()}
    >
    {busy ? "Creating…" : "Create account"}
    </Button>


    <Button
    type="button"
    variant="outline"
    disabled={busy}
    onClick={() => void signIn()}
    >
    Sign in
    </Button>
</div>


    {message && <p role="status">{message}</p>}
    </section>
  );
}