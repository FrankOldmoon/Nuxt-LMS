# Skill: Delete / restore courses and chapters

> Purpose: delete a course or a chapter, or restore deleted courses/chapters.
> The system has **no dedicated fine-grained "delete one" endpoint**; courses and chapters both go through the
> generic batch endpoint `POST /api/batch` (soft delete / hard delete / restore); `courses/delete.post.ts` only
> deletes in-course questions/homework/comments/quizzes/races, not courses themselves.

## Prerequisite: log in (admin)

Deleting/restoring courses and chapters requires admin identity (`requireAdmin`); non-admins get 403.
Log in as in skills/01:
`POST /api/auth/login` body `{ username, password }`, then carry the returned cookie.

## Three actions

| action | meaning | notes |
| --- | --- | --- |
| `delete` | soft delete | sets `deleted_at`; the record is kept and can be restored from the recycle bin |
| `remove` | hard delete | physically removes rows from the database, **unrecoverable** |
| `restore` | restore | clears `deleted_at`; soft-deleted records become visible again |

> For everyday "deletion" prefer soft delete (`delete`); use `remove` only when data loss is acceptable.

## Delete courses

`POST /api/courses/batch` (admin only), body:

```json
{
  "ids": [4, 5],
  "action": "delete"
}
```

- `ids`: array of course ids (numbers)
- `action`: `delete` / `remove` / `restore`
- Deleting/restoring a course broadcasts `home-changed` to refresh the home navigation

## Delete chapters

`POST /api/chapters/batch` (admin only), body:

```json
{
  "ids": [78, 79],
  "action": "delete"
}
```

- `ids`: array of chapter ids (numbers)
- `action`: `delete` / `remove` / `restore`
- Note: deleting a chapter does **not** remove its entry from the course `courses.orders`; update orders separately

## Delete in-course questions/homework etc. (courses/delete)

`POST /api/courses/delete` (teacher/admin), deletes **a single content entity** by type + in-course cid:

```json
{
  "course_id": 4,
  "cid": 27,
  "type": "question"
}
```

- Only for deleting in-course questions/homework/comments/quizzes/races; `type` accepts:
  `question` / `homework` / `comment` / `quiz` / `race`
- Not for deleting courses or chapters

## Cautions

- **Tree out of sync**: after deleting a chapter that is still listed in the course `orders`, its entry points at a
  non-existent id with a stale `label` and cannot be navigated. Update `courses.orders` after deleting chapters (see skills/02)
- **Soft vs hard delete**: `remove` cascades physically and loses data permanently — use with care
- **Questions still referenced**: after deleting an in-course question, the matching vue node in chapter content
  renders "question not found"; clean the chapter content up as well
