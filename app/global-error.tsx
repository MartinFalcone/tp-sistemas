"use client";

/**
 * Último recurso: se usa solo si se rompe el layout raíz, en cuyo caso Next lo
 * reemplaza entero. Por eso este archivo tiene que traer su propio <html> y
 * <body>, y por eso los estilos van inline: `globals.css` se carga desde el
 * layout que acaba de fallar, así que no se puede contar con él.
 *
 * Los colores están escritos a mano por el mismo motivo; son los de DESIGN.md.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          background: "#f2f1ea",
          color: "#1b1a17",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }}
      >
        <div style={{ maxWidth: "28rem" }}>
          <p
            style={{
              fontSize: "0.6875rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#625f55",
              borderBottom: "3px double #1b1a17",
              paddingBottom: "0.375rem",
              margin: 0,
            }}
          >
            Error
          </p>

          <h1 style={{ fontSize: "1.5rem", textTransform: "uppercase", marginTop: "1.25rem" }}>
            Se rompió la aplicación
          </h1>
          <p style={{ color: "#625f55", lineHeight: 1.5 }}>
            Recargá la página. Si sigue sin abrir, cerrá la pestaña y volvé a
            entrar por el link o el código QR.
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              minHeight: "44px",
              width: "100%",
              marginTop: "1.5rem",
              border: 0,
              borderRadius: "2px",
              background: "#1b1a17",
              color: "#f2f1ea",
              font: "inherit",
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Recargar
          </button>

          {error.digest ? (
            <p style={{ fontSize: "0.6875rem", color: "#625f55", marginTop: "1rem" }}>
              Código del error: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
