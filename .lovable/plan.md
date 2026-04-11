

## Fix Data Proxy Syntax + Add Address Book Search for MCP

### A. Breaking Bug: Missing closing brace

The `switch` block in `data-proxy/index.ts` is missing a closing `}` before the `} catch` on line 360. The switch opens at line 61 but only one `}` exists where two are needed (one to close `switch`, one to close `try`). This means the function likely fails to deploy or crashes at runtime.

**Fix:** Add `}` to close the switch block before the catch.

```
      default:
        return json({ data: null, error: `Unknown action: ${action}` }, 400);
    }  // ← close switch
  } catch (err) {  // ← close try
    return json({ data: null, error: String(err) }, 500);
  }
```

### B. New action: `search_address_book`

For Claude to answer "when is X's birthday" or "what is Y's address," the current `get_address_book` works but dumps the entire book. A search action is better:

**New action: `search_address_book`**
- Params: `user_id` (required), `query` (required — name to search)
- Searches `address_book_contacts.first_name`, `last_name` and `address_book_entries.household_name` using `ilike`
- Returns matching entries with their contacts and addresses
- Claude can then pull birthday or address from the result

This means when someone asks "when is Sarah's birthday," Claude calls `search_address_book` with `query: "Sarah"` and gets back the matching household entry with Sarah's contact record including her birthday.

### Files changed

| File | Change |
|---|---|
| `supabase/functions/data-proxy/index.ts` | Fix missing `}`, add `search_address_book` action |

### Companion project impact

The MCP tool registry needs a new tool definition for `search_address_book` with `user_id` and `query` params. This is additive — no breaking changes to existing tools.

