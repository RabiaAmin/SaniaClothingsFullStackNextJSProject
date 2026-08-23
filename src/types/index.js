/**
 * Shared JSDoc type definitions.
 * These are consumed as @typedef references across the app — no runtime code.
 * Switch to TypeScript (.ts) files to get full compile-time safety.
 */

/**
 * @typedef {Object} PayrollAuditEntry
 * @property {string} productionEntryId
 * @property {string} date
 * @property {string|null} productionOrderId
 * @property {string} poNumber
 * @property {Object|null} product
 * @property {string} productionDescription
 * @property {number} quantity
 * @property {number} unitRate
 * @property {number} amount
 */

/**
 * @typedef {Object} ProductionEntry
 * @property {string} _id
 * @property {ProductionOrder|string} productionOrder
 * @property {Object|string} worker
 * @property {string} date
 * @property {number} quantity
 * @property {number} unitRate
 * @property {number} totalAmount
 * @property {'PENDING'|'APPROVED'|'REJECTED'} status
 * @property {string} notes
 * @property {Object|string|null} reviewedBy
 * @property {string|null} reviewedAt
 * @property {string} reviewNotes
 */

/**
 * @typedef {Object} User
 * @property {string}   _id
 * @property {string}   username
 * @property {string}   email
 * @property {string}   phone
 * @property {boolean}  isActive
 * @property {boolean}  mustChangePassword
 * @property {Role|null} role
 * @property {string[]} permissions
 */

/**
 * @typedef {Object} Role
 * @property {string}       _id
 * @property {string}       name
 * @property {string}       slug
 * @property {string}       description
 * @property {Permission[]} permissions
 * @property {boolean}      isSystem
 */

/**
 * @typedef {Object} ProductionOrder
 * @property {string} _id
 * @property {string} poNumber
 * @property {Client} client
 * @property {Object|null} product
 * @property {string} productionDescription
 * @property {number} orderedQuantity
 * @property {number} approvedQuantity
 * @property {number} producedQuantity
 * @property {number} remainingQuantity
 * @property {number} progressPercentage
 * @property {number} workerRate
 * @property {string} startDate
 * @property {string} dueDate
 * @property {'PENDING'|'IN_PROGRESS'|'COMPLETED'|'CANCELLED'} status
 * @property {string} notes
 */

/**
 * @typedef {Object} Permission
 * @property {string}  _id
 * @property {string}  key
 * @property {string}  resource
 * @property {string}  action
 * @property {string}  description
 * @property {boolean} isSystem
 */

/**
 * @typedef {Object} Invoice
 * @property {string}   id
 * @property {string}   invoiceNumber
 * @property {string}   clientId
 * @property {string}   businessId
 * @property {LineItem[]} lineItems
 * @property {number}   subtotal
 * @property {number}   tax
 * @property {number}   total
 * @property {'draft'|'sent'|'paid'|'overdue'|'cancelled'} status
 * @property {string}   dueDate
 * @property {string}   createdAt
 * @property {string}   [notes]
 */

/**
 * @typedef {Object} LineItem
 * @property {string}   description
 * @property {number}   quantity
 * @property {number}   unitPrice
 * @property {number}   total
 */

/**
 * @typedef {Object} Client
 * @property {string}   id
 * @property {string}   name
 * @property {string}   email
 * @property {string}   [phone]
 * @property {string}   [address]
 * @property {string}   [vatNumber]
 * @property {string}   createdAt
 */

/**
 * @typedef {Object} Business
 * @property {string}   id
 * @property {string}   name
 * @property {string}   [email]
 * @property {string}   [phone]
 * @property {string}   [address]
 * @property {string}   [vatNumber]
 * @property {string}   [logoUrl]
 * @property {string}   currency
 * @property {string}   createdAt
 */

/**
 * @typedef {Object} BankAccount
 * @property {string}   id
 * @property {string}   businessId
 * @property {string}   bankName
 * @property {string}   accountName
 * @property {string}   accountNumber
 * @property {string}   [routingNumber]
 * @property {string}   [iban]
 * @property {string}   [swiftCode]
 * @property {string}   currency
 * @property {boolean}  isDefault
 */

/**
 * Standard paginated API response envelope.
 * @template T
 * @typedef {Object} PaginatedResponse
 * @property {T[]}    data
 * @property {number} total
 * @property {number} page
 * @property {number} limit
 * @property {number} totalPages
 */

/**
 * Standard API error shape returned by the backend.
 * @typedef {Object} ApiError
 * @property {string}   message
 * @property {number}   statusCode
 * @property {string}   [field]   – field-level validation error
 */
