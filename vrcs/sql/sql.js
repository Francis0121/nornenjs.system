/**
 * Created by pi on 14. 11. 26.
 */

module.exports.name = 'sql';

var user = {
    create :
        "CREATE TABLE user " +
        "( " +
        "   pn INTEGER PRIMARY KEY AUTOINCREMENT, " +
        "   username TEXT NOT NULL, " +
        "   password TEXT NOT NULL, " +
        "   join_date TEXT NOT NULL, " +
        "   update_date TEXT NOT NULL " +
        ") ",

    insert :
        "INSERT INTO " +
        "user " +
        "   (username, password, join_date, update_date ) " +
        "VALUES " +
        "   ( $username, $password, datetime('now'), datetime('now') ) ",

    update :
        "UPDATE user " +
        "SET " +
        "   password = $password, " +
        "   update_date = datetime('now') " +
        "WHERE " +
        "   pn = $pn ",

    updatepw :
        "UPDATE user " +
        "SET " +
        "   password = $password, " +
        "   update_date = datetime('now') " +
        "WHERE " +
        "   username = $username ",

    delete :
        "DELETE FROM " +
        "user " +
        "WHERE " +
        "   pn = $pn ",

    select :
        "SELECT " +
        "   pn, username, password, join_date AS joinDate, update_date AS updateDate " +
        "FROM " +
        "   user",

    selectUserOne :
        "SELECT" +
        "   pn, username, password, join_date, update_date " +
        "FROM " +
        "   user " +
        "WHERE " +
        "   username = $username"
}

var volume = {
    create :
        "CREATE TABLE volume " +
        "(" +
        "   pn INTEGER PRIMARY KEY AUTOINCREMENT, " +
        "   userpn INTEGER NOT NULL, " +
        "   title TEXT NOT NULL, " +
        "   save_name TEXT NOT NULL, " +
        "   file_name TEXT NOT NULL, " +
        "   input_date TEXT NOT NULL, " +
        "   FOREIGN KEY(userpn) REFERENCES user(pn) ON DELETE CASCADE " +
        ") ",

    insert :
        "INSERT INTO " +
        "volume " +
        "   ( userpn, title, save_name, file_name, input_date ) " +
        "VALUES " +
        "   ( $userpn, $title, $saveName, $fileName, datetime('now') )",

    delete :
        "DELETE FROM " +
        "volume " +
        "WHERE " +
        "   pn = $pn ",

    selectVolumeList :
        "SELECT " +
        "   pn, userpn, title, file_name, save_name, input_date " +
        "FROM " +
        "   volume " +
        "WHERE " +
        "   userpn = $userpn " +
        "ORDER BY " +
        "   input_date DESC ",

    selectVolumeOne :
        "SELECT " +
        "   pn, userpn, title, file_name, save_name, input_date " +
        "FROM " +
        "   volume " +
        "WHERE " +
        "   pn = $pn"
};

module.exports.user = user;
module.exports.volume = volume;