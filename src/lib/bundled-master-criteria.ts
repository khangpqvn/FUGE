import bundledMasterCriteriaUrl from '../template/FinalThesisGradingItems.master?url'

export const BUNDLED_MASTER_CRITERIA_NAME = 'FinalThesisGradingItems.master'

/**
 * The department master criteria ships inside the app bundle, so a council member can start
 * grading without hunting for the .master file. The bundled bytes go through the same legacy
 * codec as a picked file, so there is only one decoding path.
 */
export async function loadBundledMasterCriteriaFile(): Promise<File> {
  const response = await fetch(bundledMasterCriteriaUrl)
  if (!response.ok) {
    throw new Error(`Could not load the bundled master criteria (HTTP ${response.status}).`)
  }
  return new File([await response.arrayBuffer()], BUNDLED_MASTER_CRITERIA_NAME, {
    type: 'application/octet-stream',
  })
}
