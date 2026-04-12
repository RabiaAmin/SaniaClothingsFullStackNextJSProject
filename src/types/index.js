/**
 * Shared JSDoc type definitions.
 * These are consumed as @typedef references across the app — no runtime code.
 * Switch to TypeScript (.ts) files to get full compile-time safety.
 */

/**
 * @typedef {Object} User
 * @property {string}   id
 * @property {string}   firstName
 * @property {string}   lastName
 * @property {string}   email
 * @property {'admin'|'user'} role
 * @property {string}   createdAt
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
