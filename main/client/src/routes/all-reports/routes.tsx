import { useSuspenseData, Link } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/all-reports/routes')({
  loader: async () => {
    const response = await fetch('http://127.0.0.1:5000/reports/status')
      .then(r => r.json());
    return { response }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { response } = useSuspenseData();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Found Items</h1>
      
      <div className="overflow-x-auto shadow-md rounded-lg">  
        <table className="w-full text-sm text-left text-gray-700 bg-white border border-gray-200">
          <thead className="text-xs text-gray-900 uppercase bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 font-medium">ID</th>
              <th className="px-6 py-3 font-medium">Reported By</th>
              <th className="px-6 py-3 font-medium">Object</th>
              <th className="px-6 py-3 font-medium">Description</th>
              <th className="px-6 py-3 font-medium">Location</th>
              <th className="px-6 py-3 font-medium">Date Reported</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Image</th>
            </tr>
          </thead>
          <tbody>
            {response.map((report: any, index: number) => (
              <tr key={report.found_object_id || index} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-mono text-sm">{report.found_object_id}</td>
                <td className="px-6 py-4 font-semibold">{report.found_by}</td>
                <td className="px-6 py-4">
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {report.found_object_name}
                  </span>
                </td>
                <td className="px-6 py-4 max-w-xs truncate" title={report.found_description}>
                  {report.found_description}
                </td>
                <td className="px-6 py-4">
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                    {report.found_last_location_seen}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  {new Date(report.found_date_reported).toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  {report.found_status === 'verifying' ? (
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-3 py-1 rounded-full font-medium">
                      Verifying
                    </span>
                  ) : (
                    <span className="bg-gray-100 text-gray-800 text-xs px-3 py-1 rounded-full">
                      Reported
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <img 
                    src={report.found_image_url} 
                    alt="Found item"
                    className="w-12 h-12 object-cover rounded border"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling!.style.display = 'block';
                    }}
                  />
                  <span className="hidden text-xs text-gray-500">No image</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
