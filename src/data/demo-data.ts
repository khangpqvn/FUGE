import type { TeacherGrade } from '../types/models'

export const initialTeacherGrade: TeacherGrade = {
  Version: '1.1',
  Semester: 'Summer 2026',
  Login: 'Evaluator workspace',
  Password: '',
  SubjectClassGrades: [
    {
      Subject: 'SEP490',
      Class: 'SE1732',
      Components: ['Status', 'Presentation', 'Technical depth', 'Report quality'],
      Students: [
        {
          Roll: 'HE173247',
          Name: 'Nguyen Minh Anh',
          Comment: 'Strong prototype and clear defense.',
          Grades: [
            { Component: 'Status', Grade: 1 },
            { Component: 'Presentation', Grade: 8.5 },
            { Component: 'Technical depth', Grade: 8 },
            { Component: 'Report quality', Grade: 8.5 },
          ],
        },
        {
          Roll: 'HE173248',
          Name: 'Tran Gia Bao',
          Comment: 'Revise deployment notes before final submission.',
          Grades: [
            { Component: 'Status', Grade: 1 },
            { Component: 'Presentation', Grade: 7.5 },
            { Component: 'Technical depth', Grade: 7 },
            { Component: 'Report quality', Grade: 8 },
          ],
        },
        {
          Roll: 'HE173249',
          Name: 'Le Thu Ha',
          Comment: '',
          Grades: [
            { Component: 'Status', Grade: 0 },
            { Component: 'Presentation', Grade: 6 },
            { Component: 'Technical depth', Grade: 6.5 },
            { Component: 'Report quality', Grade: 7 },
          ],
        },
        {
          Roll: 'HE173250',
          Name: 'Pham Duc Long',
          Comment: 'Good methodology; improve edge-case coverage.',
          Grades: [
            { Component: 'Status', Grade: 1 },
            { Component: 'Presentation', Grade: 8 },
            { Component: 'Technical depth', Grade: 8.5 },
            { Component: 'Report quality', Grade: 7.5 },
          ],
        },
      ],
    },
    {
      Subject: 'SEP490',
      Class: 'SE1733',
      Components: ['Status', 'Presentation', 'Technical depth', 'Report quality'],
      Students: [
        {
          Roll: 'HE173301',
          Name: 'Do Quang Huy',
          Comment: '',
          Grades: [
            { Component: 'Status', Grade: 1 },
            { Component: 'Presentation', Grade: 8 },
            { Component: 'Technical depth', Grade: 7.5 },
            { Component: 'Report quality', Grade: 8 },
          ],
        },
      ],
    },
  ],
}
