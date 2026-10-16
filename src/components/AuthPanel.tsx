import { useState } from "react";
import { Button } from "./ui/button";
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase";

export default function AuthPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [leadLogin, setLeadLogin] = useState(false);

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
        leadLogin? "scout.lead.955@student.csd509j.net" : email.trim().toLowerCase(),
        password
        );
    } catch (error) {
        setMessage(error instanceof Error ? error.message : String(error));
    } finally {
        setBusy(false);
    }
    }



  return ( !leadLogin ? (


    <><div className="flex justify-end p-4 sm:p-6">
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => { setLeadLogin(!leadLogin);
                         
        }}
      >
        Lead login
      </Button>
    </div>
    <section className="mx-auto max-w-lg p-6 space-y-3">
        <h3>Log in for Scout account</h3>

        <label className="block">
          School email
          <input
            className="field"
            type="email"
            autoComplete="email"
            disabled={leadLogin || busy}
            value={email}
            onChange={(event) => setEmail(event.target.value)} />
        </label>

        <label className="block">
          QuickScout password
          <input
            className="field"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)} />
        </label>


        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            disabled={busy}
            onClick={() => void createAccount()}
          >
            Create account
          </Button>


          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void signIn()}
          >
            Sign in
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={async () => {
              const address = email.trim().toLowerCase();
              if (!address.endsWith("@student.csd509j.net")) {
                setMessage("Use your school email.");
                return;
              }

              setBusy(true);
              setMessage("Sending reset email…");
              try {
                await sendPasswordResetEmail(auth, address);
                setMessage("If an account exists for this email, check your inbox for a reset link.");
              } catch {
                setMessage("Failed to send reset message.");
              } finally {
                setBusy(false);
              }
            } }
          >
            Forgot password?
          </Button>
        </div>


        {message && <p role="status">{message}</p>}
      </section></>

          ) :(
            <><div className="flex justify-end p-4 sm:p-6">
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => { setLeadLogin(!leadLogin);
                         
        }}
      >
        Scout login
      </Button>
    </div>
    <section className="mx-auto max-w-lg p-6 space-y-3">
        <h3>Log in as lead</h3>

       

        <label className="block">
          QuickScout password
          <input
            className="field"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)} />
        </label>


        <div className="flex flex-wrap gap-3">
          


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
      </section></>
          )
  );
}
