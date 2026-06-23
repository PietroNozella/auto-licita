import { google } from "googleapis"

interface SheetsRow {
  [key: string]: string | number | boolean | null
}

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const key = process.env.GOOGLE_PRIVATE_KEY
  if (!email || !key) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL e GOOGLE_PRIVATE_KEY são obrigatórios")
  }
  return new google.auth.JWT({
    email,
    key: key.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  })
}

export async function exportarParaSheets(
  spreadsheetId: string,
  sheetName: string,
  headers: string[],
  rows: SheetsRow[]
) {
  const auth = getAuth()
  const sheets = google.sheets({ version: "v4", auth })

  // Prepara header row
  const headerRow = headers.map((h) => h)

  // Prepara data rows na ordem dos headers
  const dataRows = rows.map((row) => headers.map((h) => row[h] ?? ""))

  const values = [headerRow, ...dataRows]

  // Primeiro verifica se a planilha existe
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId })
  const sheetExists = spreadsheet.data.sheets?.some(
    (s) => s.properties?.title === sheetName
  )

  if (!sheetExists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: sheetName } } }],
      },
    })
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  })

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
}
