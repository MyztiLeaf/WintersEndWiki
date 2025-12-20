
document.addEventListener('DOMContentLoaded', () => {
    const sidebarHtml = `
    <nav class="sidebar" id="sidebar">
        <div class="sidebar-title">Winter's End Wiki</div>

        <div class="category">
            <div class="cat-btn">Slugcats</div>
            <div class="dropdown">
                <a href="Snowflake.html">
                    <img src="icons/Snowflake_icon.png" class="icon"> Snowflake
                </a>
                <a href="Beecat.html">
                    <img src="icons/Beecat_icon.png" class="icon"> Beecat
                </a>
                <a href="Nightwalker.html">
                    <img src="icons/Nightwalker-icon.png" class="icon"> Nightwalker
                </a>
                <a href="#">
                    <img src="icons/Monk_icon.png" class="icon"> Lumia
                </a>
            </div>
        </div>

        <div class="category">
            <div class="cat-header">
                <div class="cat-btn">Region</div>
                <a href="https://myztileaf.github.io/WintersEndMap/" target="_blank"
                    class="header-map-link">[Interactive Map]</a>
            </div>
            <div class="dropdown">
                <a href="Z1.html">
                    <img src="icons/Monk_icon.png" class="icon"> Conduit Reliquary (Z1)
                </a>
                <a href="#">
                    <img src="icons/Monk_icon.png" class="icon"> Outpost Citadel (Z2)
                </a>
                <a href="#">
                    <img src="icons/Monk_icon.png" class="icon"> Blizzard's Embrace (Z3)
                </a>
                <a href="#">
                    <img src="icons/Monk_icon.png" class="icon"> Ashen Desolation (Z4)
                </a>
                <a href="#">
                    <img src="icons/Monk_icon.png" class="icon"> FrostFall Expanse (Z5)
                </a>
            </div>
        </div>

        <div class="category">
            <div class="cat-btn">Creature</div>
            <div class="dropdown">
                <a href="#">
                    <img src="icons/Frost_Lizard_icon.png" class="iconBliz"> Frost Lizard
                </a>
                <a href="#">
                    <img src="icons/WE_Blizzard_Lizard_icon.png" class="iconBliz"> Blizzard Lizard
                </a>
            </div>
        </div>

        <div class="category">
            <div class="cat-btn">Object</div>
            <div class="dropdown">
                <a href="#">
                    <img src="icons/Monk_icon.png" class="icon"> WIP
                </a>
            </div>
        </div>

        <div class="category">
            <div class="cat-btn">Iterator</div>
            <div class="dropdown">
                <a href="#">
                    <img src="icons/Cryobloom_Mist_icon.png" class="icon"> CryoBloom Mist
                </a>
            </div>
        </div>

        <a href="index.html" class="home-link">Wiki Home</a>
    </nav>

    <button id="sidebar-toggle" title="Toggle Sidebar">
        <span class="toggle-icon">◀</span>
    </button>
    `;

    // Inject sidebar at the beginning of the body
    document.body.insertAdjacentHTML('afterbegin', sidebarHtml);

    // Sidebar Toggle Functionality
    const toggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');

    if (toggle && sidebar) {
        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            toggle.classList.toggle('collapsed');
        });
    }
});
