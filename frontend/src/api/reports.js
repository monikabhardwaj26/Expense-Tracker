import client from './client'

export const fetchMonthlyReport = (month) =>
  client.get('/reports/monthly/', { params: { month } }).then((r) => r.data)

// Triggers a real file download of the CSV the backend generates for `month`.
export const downloadMonthlyReport = async (month) => {
  const response = await client.get('/reports/monthly/download/', {
    params: { month },
    responseType: 'blob',
  })
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `smartspend-report-${month}.csv`)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
