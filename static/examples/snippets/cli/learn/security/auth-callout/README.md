# auth-callout snippets

The page's token-publish success/failure demo stays inline in
`learn/security/auth-callout.md` instead of living here: it only works
with a live `auth-svc` answering requests on `$SYS.REQ.USER.AUTH`, and
writing that handler is a programming task (see the page's See also
links for callout.go / callout.net). A stand-alone CLI snippet can't
run it.

The snippets here (`callout-timeout.sh`, `auth-users-scope.sh`,
`observe-request.sh`) deliberately run *without* an auth service
answering. For the two pitfalls, that absence is what each one
demonstrates. `observe-request.sh` only reads the authorization request
the server publishes to `$SYS.REQ.USER.AUTH` and never replies, so no
handler is needed to show the plaintext credential on the subject.
