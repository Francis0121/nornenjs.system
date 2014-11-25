/**
 * Created by pi on 14. 11. 26.
 */

module.exports.name = 'sql';

var user = {
    create :
        "CREATE TABLE user " +
        "(pn INTEGER PRIMARY KEY AUTOINCREMENT, " +
        "username TEXT NOT NULL, " +
        "password TEXT NOT NULL, " +
        "join_date TEXT, " +
        "update_date TEXT) ",

    insert :
        "INSERT INTO " +
        "user " +
        "   (username, password, join_date, update_date ) " +
        "VALUES " +
        "   ( $username, $password, datetime('now'), datetime('now') ) ",

    update :
        "UPDATE user" +
        "SET" +
        "   password = $password, " +
        "   update_date = datetime('now') " +
        "WHERE " +
        "   pn = $pn ",

    delete :
        "DELETE FROM " +
        "user " +
        "WHERE " +
        "   pn = $pn ",

    selectUserOne :
        "SELECT" +
        "   pn, username, password, join_date, update_date " +
        "FROM " +
        "   user " +
        "WHERE " +
        "   username = $" +
            "username"

}

module.exports.user = user;