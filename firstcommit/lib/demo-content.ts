// Editable recording presets based on Library_Management_System_Report.pdf.
// These are inputs and teaching templates, not generated AI results.
export const DEMO_TOPIC = "Library Management System";
export const DEMO_PROMPT = "Using my uploaded Library Management System report, explain the architecture, Books versus BookCopies, and the book issue and return workflow. Cover membership validation, reservations, overdue fines, and transaction consistency. Then help me prepare for my project viva in English.";
export const DEMO_MISCONCEPTION = "In my Library Management System, I think Books and BookCopies can be one table. When one copy is issued, I mark the whole title unavailable. I also allow renewal even when another member has reserved the book.";
export const DEMO_RECOVERY = "Books stores bibliographic details, while BookCopies tracks each physical copy using its own accession number and status. Issuing one copy does not make every copy unavailable. Before issue, validate membership, issue limits, and copy availability; create the issue and update the copy in one transaction. Renewal is blocked when another member has reserved the book.";
export const DEMO_AGENDA = ["Project overview and user roles", "Books, BookCopies, Members, and Issues", "Issue and return validation", "Reservations, fines, and test cases"];
export const DEMO_CODE = `// Library Management System: configured fine policy (report section 5.3).
function calculateFine(overdueDays: number, dailyRate: number): number {
  if (!Number.isInteger(overdueDays) || !Number.isFinite(dailyRate) || dailyRate < 0) {
    throw new Error("Invalid overdue days or daily rate");
  }
  return Math.round(Math.max(0, overdueDays) * dailyRate * 100) / 100;
}
// Illustrative policy: 3 overdue days at 2 currency units per day.
console.log(calculateFine(3, 2)); // 6
console.log(calculateFine(0, 2)); // 0`;
export const DEMO_DIAGRAMS = {
  flowchart: `flowchart TD
  A[Librarian signs in] --> B[Select member and physical copy]
  B --> C{Active member, below issue limit, copy available?}
  C -- No --> D[Reject with validation message]
  C -- Yes --> E[Begin database transaction]
  E --> F[Create issue and due date]
  F --> G[Mark copy Issued]
  G --> H[Commit transaction]`,
  class: `classDiagram
  class Book {\n    book_id\n    ISBN\n    title\n  }
  class BookCopy {\n    copy_id\n    accession_no\n    status\n  }
  class Member {\n    member_id\n    issue_limit\n  }
  class Issue {\n    issue_id\n    due_date\n    return_date\n  }
  Book "1" --> "many" BookCopy : has
  BookCopy "1" --> "many" Issue : history
  Member "1" --> "many" Issue : borrows`,
  sequence: `sequenceDiagram
  participant Librarian
  participant Application
  participant Database
  Librarian->>Application: Return physical copy
  Application->>Database: Locate active issue
  Database-->>Application: Due date and member
  Application->>Application: Calculate overdue fine
  Application->>Database: Close issue and update copy in transaction
  Database-->>Application: Commit successful
  Application-->>Librarian: Return recorded; check next reservation`,
  er: `erDiagram
  BOOKS ||--o{ BOOK_COPIES : has
  BOOKS ||--o{ BOOK_AUTHORS : credits
  AUTHORS ||--o{ BOOK_AUTHORS : writes
  USERS ||--o| MEMBERS : has
  MEMBERS ||--o{ ISSUES : borrows
  BOOK_COPIES ||--o{ ISSUES : records
  ISSUES ||--o{ FINES : incurs
  MEMBERS ||--o{ RESERVATIONS : places
  BOOKS ||--o{ RESERVATIONS : receives`,
  state: `stateDiagram-v2
  [*] --> Available
  Available --> Issued: Valid issue
  Issued --> Available: Return without hold
  Issued --> Reserved: Return with reservation
  Reserved --> Issued: Issue to waiting member
  Issued --> Lost: Report lost
  Issued --> Damaged: Record damage`,
};
