# Week 4 — Data Dictionary

**Project:** Buildmart Shopping Cart Module
**Group:** Group 2 — Ranjan, Kalyan, Shailendra, Diya, Dipesh, Sujan, Anjan
**Source:** Built from the Project Data Inventory in [`docs/week2-data-analysis.md`](../week2-data-analysis.md) (Activity 2)

This dictionary lists the key data our shopping cart stores and uses. It is the basis for our Week 5 Entity Relationship Diagram (ERD).

---

## Key data fields

| Field name | Entity | Key | Description | Importance |
| --- | --- | --- | --- | --- |
| ProductID | Product | PK | Unique identifier (SKU) for each product | Core |
| ProductName | Product | | Name shown to the customer | High |
| UnitPrice | Product | | Base price before quantity and GST | Core |
| StockStatus | Product | | Whether a product is in stock (planned) | High |
| SessionID | Cart | PK | Identifies a customer's active cart | High |
| Timestamp | Cart | | When an item was added or changed | Medium |
| GSTAmount | Cart | | Tax amount on the cart total (10% of subtotal) | High |
| LiveTotalPrice | Cart | | Running total of the cart | Core |
| CartItemList | Cart | | Products currently in the cart (stored as CartItem rows) | Core |
| Quantity | CartItem | | Number of units selected | Core |

**Importance:** Core = required for the cart to work · High = important for accuracy or the customer experience · Medium = useful for tracking

---

## Entities

| Entity | What it represents | Primary key | Foreign keys |
| --- | --- | --- | --- |
| Product | An item in the catalogue (e.g. screws, timber, silicone) | ProductID | — |
| Cart | One customer's active shopping session | SessionID | — |
| CartItem | One line in the cart: a product and how many | CartItemID | SessionID → Cart, ProductID → Product |
| Customer *(planned, Version 2)* | A registered account for saved project lists and order history | CustomerID | — |

---

## Relationships

- **One Cart has many CartItems** (one-to-many)
- **One Product can appear in many CartItems** (one-to-many)
- **CartItem** links Cart and Product, which resolves the many-to-many relationship between them.

## Business rules

1. A Cart must belong to exactly one session.
2. A CartItem must reference an existing Product.
3. Quantity must always be greater than zero.
4. GST is calculated as 10% of the cart subtotal.
