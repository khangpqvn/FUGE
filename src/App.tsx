import React, { useState, useMemo } from 'react'
import { Search, Save, FolderOpen, X, UserPlus } from 'lucide-react'
import type { TeacherGrade } from './types/models'
import { decryptLegacyFg, encryptLegacyFg, downloadBlob } from './lib/legacy-fg'

const LEGACY_VERSION = '1.1'

export default function GradingDashboard() {
  const [tg, setTg] = useState<TeacherGrade | null>(null)
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [password, setPassword] = useState('')
  const [mergeClasses, setMergeClasses] = useState(false)

  const handleOpenFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return
    try {
      const data = await decryptLegacyFg(e.target.files[0], password)
      setTg(data)
    } catch (err: any) {
      alert(err.message || 'Failed to open file')
    }
  }

  const handleSaveFile = async () => {
    if (!tg) return
    setIsSaving(true)
    try {
      const blob = await encryptLegacyFg(tg)
      downloadBlob(blob, `graded_${tg.Login}_${tg.Semester}.fg`)
    } catch (err) {
      alert('Save failed')
    } finally {
      setIsSaving(false)
    }
  }

  const currentGroup = useMemo(() => {
    if (!tg) return null
    if (!mergeClasses) {
      return tg.SubjectClassGrades[selectedGroupIndex]
    }

    const firstGroup = tg.SubjectClassGrades[0]
    const mergedStudents = tg.SubjectClassGrades.flatMap(g => g.Students)
    return {
      ...firstGroup,
      Class: 'All Classes',
      Students: mergedStudents
    }
  }, [tg, selectedGroupIndex, mergeClasses])

  const filteredStudents = useMemo(() => {
    if (!currentGroup) return []
    return currentGroup.Students.filter(s =>
      s.Roll.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.Name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [currentGroup, searchQuery])

  const updateStudent = (roll: string, changes: Partial<{ Comment: string }>) => {
    if (!tg) return
    setTg({
      ...tg,
      SubjectClassGrades: tg.SubjectClassGrades.map((group) => ({
        ...group,
        Students: group.Students.map((student) => student.Roll === roll ? { ...student, ...changes } : student),
      })),
    })
  }

  const updateMark = (roll: string, component: string, value: string) => {
    if (!tg) return
    const numericValue = value === '' ? null : Number(value)
    if (numericValue !== null && (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > 10)) return
    setTg({
      ...tg,
      SubjectClassGrades: tg.SubjectClassGrades.map((group) => ({
        ...group,
        Students: group.Students.map((student) => student.Roll === roll ? {
          ...student,
          Grades: student.Grades.map((grade) => grade.Component === component ? { ...grade, Grade: numericValue } : grade),
        } : student),
      })),
    })
  }

  if (!tg) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">
        <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border border-slate-200 text-center">
          <div className="mb-6 flex justify-center">
            <div className="p-4 bg-blue-100 rounded-full text-blue-600">
              <FolderOpen size={48} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">FUGE Grade Desk</h1>
          <p className="text-slate-500 mb-8">Upload a .fg file to start grading</p>

          <div className="space-y-4">
            <div className="text-left">
              <label className="block text-sm font-medium text-slate-700 mb-1">File Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="Enter password if required"
              />
            </div>

            <label className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold cursor-pointer transition-colors shadow-lg active:scale-95">
              <FolderOpen size={20} />
              Open Grading File
              <input type="file" accept=".fg" className="hidden" onChange={handleOpenFile} />
            </label>

            <div className="pt-4 text-xs text-slate-400">
              Compatible with FuGrade v{LEGACY_VERSION}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-slate-100 text-slate-900">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 text-white p-2 rounded-lg font-bold">FG</div>
          <div>
            <h2 className="text-lg font-bold leading-none">{tg.Login}</h2>
            <p className="text-xs text-slate-500 mt-1">{tg.Semester} • {tg.Version}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setTg(null)}
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
            title="Change File"
          >
            <X size={20} />
          </button>
          <button
            onClick={handleSaveFile}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white rounded-lg font-medium transition-all active:scale-95 shadow-sm"
          >
            {isSaving ? 'Saving...' : <><Save size={18} /> Save Sheet</>}
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Subject/Class Navigation */}
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Groups</h3>
              <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={mergeClasses}
                  onChange={e => setMergeClasses(e.target.checked)}
                  className="rounded text-blue-600"
                />
                Merge All
              </label>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {tg.SubjectClassGrades.map((group, idx) => (
              <button
                key={`${group.Subject}-${group.Class}`}
                onClick={() => setSelectedGroupIndex(idx)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all ${
                  selectedGroupIndex === idx && !mergeClasses
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="font-bold">{group.Subject}</div>
                <div className="text-xs opacity-70">{group.Class}</div>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Grading Area */}
        <section className="flex-1 flex flex-col overflow-hidden">
          {currentGroup ? (
            <>
              <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {currentGroup.Subject} - {currentGroup.Class}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {currentGroup.Students.length} Students • {currentGroup.Components.length} Components
                  </p>
                </div>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-sm font-medium transition-colors">
                  <UserPlus size={16} />
                  Add Student
                </button>
              </div>

              <div className="flex-1 overflow-auto p-6">
                <div className="inline-block min-w-full align-middle shadow-sm rounded-xl border border-slate-200 overflow-hidden bg-white">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider w-12">#</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider w-32">Roll</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider min-w-[200px]">Name</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider min-w-[200px]">Comment</th>
                        {currentGroup.Components.map(comp => (
                          <th key={comp} className="px-4 py-3 text-center font-semibold text-slate-600 uppercase tracking-wider w-24">
                            {comp}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredStudents.map((student, idx) => (
                        <tr key={student.Roll} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-4 py-3 text-slate-400 text-center">{idx + 1}</td>
                          <td className="px-4 py-3 font-mono font-medium text-slate-700">{student.Roll}</td>
                          <td className="px-4 py-3 text-slate-800">{student.Name}</td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={student.Comment}
                              onChange={e => updateStudent(student.Roll, { Comment: e.target.value })}
                              className="w-full px-2 py-1 border border-transparent hover:border-slate-300 focus:border-blue-500 rounded bg-transparent outline-none transition-all"
                              placeholder="Add comment..."
                            />
                          </td>
                          {currentGroup.Components.map(comp => {
                            const gradeObj = student.Grades.find(g => g.Component === comp)
                            return (
                              <td key={comp} className="px-4 py-3 text-center">
                                <input
                                  type="text"
                                  value={gradeObj?.Grade ?? ''}
                                  onChange={e => updateMark(student.Roll, comp, e.target.value)}
                                  className={`w-16 px-2 py-1 text-center border rounded transition-all outline-none
                                    ${(gradeObj?.Grade ?? null) === null
                                      ? 'bg-slate-50 border-slate-200'
                                      : 'bg-white border-slate-300 focus:ring-2 focus:ring-blue-500'
                                    }`}
                                />
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                      {filteredStudents.length === 0 && (
                        <tr>
                          <td colSpan={4 + currentGroup.Components.length} className="px-4 py-12 text-center text-slate-400 italic">
                            No students found matching your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              Select a group to start grading
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
