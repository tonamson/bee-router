import KeyUsageClient from "./KeyUsageClient";

export default async function ApiKeyUsagePage({ params }) {
  const { id } = await params;
  return <KeyUsageClient keyId={id} />;
}
