export function ErpApiHint({ path, note }: { path: string; note?: string }) {
  return (
    <p className="mt-4 border-t border-marinha-900/8 pt-4 text-xs text-marinha-500">
      <span className="font-medium text-marinha-600">API</span>{" "}
      <code className="rounded bg-marinha-900/5 px-1 font-mono text-marinha-800">
        {path}
      </code>
      {note ? (
        <>
          {" · "}
          {note}
        </>
      ) : (
        <>
          {" · "}
          Autenticação JWT e, nas rotas do negócio, header{" "}
          <code className="font-mono text-marinha-800">X-Business-Id</code>.
        </>
      )}
    </p>
  );
}
