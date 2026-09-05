"use client";

/*
 * PÁGINA TEMPORAL — borrar antes del deploy (ver CLAUDE.md).
 * Existe para revisar la identidad visual en un celular real.
 */

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { OptionRow } from "@/components/ui/OptionRow";
import { Paper, PaperHeader } from "@/components/ui/Paper";
import { ProgressDots } from "@/components/ui/ProgressDots";
import { Timer } from "@/components/ui/Timer";

const TOTAL_MS = 25_000;

export default function StyleguidePage() {
  const [remaining, setRemaining] = useState(TOTAL_MS);
  const [nickname, setNickname] = useState("Martín");
  const [selected, setSelected] = useState<string | null>("A");
  const [revealKey, setRevealKey] = useState(0);

  // El Timer es presentacional; acá lo movemos solo para poder mirarlo.
  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((ms) => (ms <= 0 ? TOTAL_MS : ms - 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <Paper className="gap-8">
      <PaperHeader left="Styleguide" right="Borrar antes del deploy" />

      <Section title="Paleta">
        <div className="grid grid-cols-5 gap-1">
          {[
            ["papel", "bg-papel"],
            ["banda", "bg-banda"],
            ["tinta", "bg-tinta"],
            ["cinta", "bg-cinta"],
            ["carbon", "bg-carbon"],
          ].map(([name, bg]) => (
            <div key={name} className="space-y-1">
              <div className={`h-12 border border-filete ${bg}`} />
              <p className="font-mono text-[0.625rem] text-carbon">{name}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Tipografía">
        <p className="font-mono text-sm text-carbon">
          MONO · la máquina · 0123456789
        </p>
        <p className="text-[0.9375rem] leading-snug">
          Sans · la persona. ¿Qué parte de la impresora golpea la cinta
          entintada para formar los caracteres?
        </p>
      </Section>

      <Section title="Botones">
        <Button full>Entrar</Button>
        <Button full variant="outline">
          Ver ranking
        </Button>
        <Button full disabled>
          Deshabilitado
        </Button>
        <div className="text-center">
          <Button variant="quiet">Cambiar de nombre</Button>
        </div>
      </Section>

      <Section title="Input">
        <Input
          id="sg-nick"
          label="Apodo"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          hint="Hasta 20 caracteres."
          maxLength={20}
        />
        <Input
          id="sg-nick-error"
          label="Apodo"
          defaultValue="pelotudo"
          error="Ese apodo no se puede usar acá. Elegí otro."
        />
      </Section>

      <Section title="Timer">
        <Timer remainingMs={remaining} totalMs={TOTAL_MS} />
        <Timer remainingMs={3200} totalMs={TOTAL_MS} />
        <p className="font-mono text-[0.6875rem] text-carbon">
          Abajo: últimos 5 s. Cambia a rojo Y a trama diagonal.
        </p>
      </Section>

      <Section title="ProgressDots">
        <ProgressDots total={10} current={4} answered={3} />
        <p className="font-mono text-[0.6875rem] text-carbon">
          Sólido = respondida · hueco grande = actual · punto = pendiente
        </p>
      </Section>

      <Card title="Card (hoja)" meta="Total 1 240">
        <p className="text-[0.9375rem]">
          Sin sombra, sin radio, sin fondo elevado. Filete doble arriba, simple
          abajo. Es un bloque de listado, no una tarjeta.
        </p>
      </Card>

      <Section title="Opciones · sin responder">
        {["A", "B", "C", "D"].map((letter, index) => (
          <OptionRow
            key={letter}
            letter={letter}
            state={selected === letter ? "selected" : "idle"}
            onSelect={() => setSelected(letter)}
          >
            {
              [
                "Las agujas del cabezal",
                "El rodillo de arrastre",
                "La banda perforada",
                "El tractor de papel",
              ][index]
            }
          </OptionRow>
        ))}
      </Section>

      <Section title="Opciones · resultado">
        <div key={revealKey}>
          <OptionRow letter="A" state="correct" note="Correcta" reveal>
            Las agujas del cabezal
          </OptionRow>
          <OptionRow letter="B" state="incorrect" note="Tu respuesta">
            El rodillo de arrastre
          </OptionRow>
          <OptionRow letter="C" state="unanswered">
            La banda perforada
          </OptionRow>
          <OptionRow letter="D" state="unanswered">
            El tractor de papel
          </OptionRow>
        </div>
        <Button variant="outline" full onClick={() => setRevealKey((n) => n + 1)}>
          Repetir el barrido
        </Button>
        <p className="font-mono text-[0.6875rem] text-carbon">
          Los tres estados se distinguen en escala de grises: bloque sólido,
          tachado, punteado.
        </p>
      </Section>

      <Section title="Ranking (bandas alternadas)">
        <div className="font-mono text-sm">
          {[
            ["01", "MARTÍN F.", "8/10", "9 420"],
            ["02", "ANA", "8/10", "9 105"],
            ["03", "LU", "7/10", "8 330"],
            ["04", "FEDE", "7/10", "7 990"],
          ].map(([pos, name, hits, score], index) => (
            <div
              key={pos}
              className={`flex items-center gap-3 px-1.5 py-2 ${
                index % 2 === 1 ? "bg-banda" : ""
              }`}
            >
              <span className="w-[2ch] shrink-0 text-carbon tabular-nums">
                {pos}
              </span>
              <span className="min-w-0 flex-1 truncate font-semibold">{name}</span>
              <span className="shrink-0 text-carbon tabular-nums">{hits}</span>
              <span className="w-[5ch] shrink-0 text-right font-semibold tabular-nums">
                {score}
              </span>
            </div>
          ))}
          <div className="mt-1 flex items-center gap-3 border-t-2 border-tinta bg-tinta px-1.5 py-2 text-papel">
            <span className="w-[2ch] shrink-0 tabular-nums">12</span>
            <span className="min-w-0 flex-1 truncate font-semibold">VOS</span>
            <span className="shrink-0 tabular-nums">6/10</span>
            <span className="w-[5ch] shrink-0 text-right font-semibold tabular-nums">
              6 210
            </span>
          </div>
        </div>
      </Section>
    </Paper>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-mono text-[0.6875rem] tracking-[0.14em] text-carbon uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}
