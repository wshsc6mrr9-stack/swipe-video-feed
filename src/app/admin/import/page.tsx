import ImportQueueClient from "./import-client2";

export default function AdminImportPage() {
  return (
    <div className="mx-auto max-w-4xl p-4">
      <h1 className="text-xl font-bold">Import Queue</h1>
      <p className="mt-2 text-sm opacity-70">キューに溜まった import を確認・削除できます</p>

      <div className="mt-4">
        <ImportQueueClient />
      </div>
    </div>
  );
}
