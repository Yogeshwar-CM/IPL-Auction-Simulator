import streamlit as st
import json
import pandas as pd

# Load JSON Data
def load_json(file):
    with open(file, "r") as f:
        return json.load(f)

# Save JSON Data
def save_json(file, data):
    with open(file, "w") as f:
        json.dump(data, f, indent=4)

# Load players & teams
players = load_json("players.json")
teams = load_json("teams.json")

st.title("🏏 IPL Auction System")

# Sidebar Navigation
page = st.sidebar.radio("Navigation", ["Admin Panel", "Team View"])

# Admin Panel
if page == "Admin Panel":
    st.header("🎤 Admin Panel - Conduct Auction")

    # Select unsold players
    unsold_players = [p for p in players if p["sold_price"] is None]
    if unsold_players:
        selected_player = st.selectbox("Select Player for Auction", [p["name"] for p in unsold_players])
        player_data = next(p for p in players if p["name"] == selected_player)

        # Select winning team
        selected_team = st.selectbox("Select Winning Team", [t["name"] for t in teams])
        bid_price = st.number_input("Enter Final Bid Price (in Crores)", min_value=float(player_data["base_price"]), step=0.1)

        if st.button("Confirm Sale"):
            team_data = next(t for t in teams if t["name"] == selected_team)

            if team_data["balance"] >= bid_price:
                # Update player
                player_data["sold_price"] = bid_price
                player_data["team"] = selected_team

                # Update team
                team_data["balance"] -= bid_price
                team_data["players"].append({"name": selected_player, "price": bid_price})

                # Save changes
                save_json("players.json", players)
                save_json("teams.json", teams)

                st.success(f"{selected_player} sold to {selected_team} for ₹{bid_price} Cr!")
            else:
                st.error(f"{selected_team} does not have enough balance!")

    else:
        st.info("No more players available for auction.")

# Team View
elif page == "Team View":
    st.header("📋 Team Details")

    for team in teams:
        st.subheader(team["name"])
        st.write(f"💰 Remaining Balance: ₹{team['balance']} Cr")
        st.write("🏏 Players Bought:")
        if team["players"]:
            df = pd.DataFrame(team["players"])
            st.table(df)
        else:
            st.write("No players bought yet.")

    st.subheader("🔍 Auctioned Players")
    sold_players = [p for p in players if p["sold_price"] is not None]
    if sold_players:
        df = pd.DataFrame(sold_players)[["name", "sold_price", "team"]]
        df.columns = ["Player", "Sold Price (Cr)", "Team"]
        st.table(df)
    else:
        st.info("No players sold yet.")