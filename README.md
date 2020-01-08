<h1>🦄 Mongoose dedupe</h1>
<p>
  <img src="https://github.com/MikeIbberson/mongoose-dedupe/workflows/Node%20CI/badge.svg" alt="Status" />
</p>
<p>Like uniqueness checking but on steroids. Check for individually unique fields, collectively unique queries and unique subdocument values all from within the mongoose Schema.</p>

<h2>For Parents</h2>

| Prop         | Description                                          |
| ------------ | ---------------------------------------------------- |
| `dedupe`     | Use this to lookup a single field value's uniqueness |
| `dedupeWith` | Runs all properties with this flag in a query        |

<h2>For Subs</h2>

| Prop         | Description                                                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `distinct`   | Use this to make a sub-document value unique. If `merge` or `accumulate` options are not present in sibling options, then it will error on match. |
| `merge`      | Use this to overwrite a sub-document property on match                                                                                            |
| `accumulate` | Use this to add to a sub-document property on match                                                                                               |

Additionally, you can pass an "options" property to the plugin to append query data to each lookup. This is useful if you're using another plugin, such as one that checks the "active" state of a document.