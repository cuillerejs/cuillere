import { app } from "./http-server.js"

app.listen(3000).then(url => console.log(`🚀 served on ${url}/graphql`))
