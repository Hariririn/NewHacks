let map;
        let activeCategory = 'visited';
        let markers = [];
        let currentMarker = null;
        let selectedRating = 0;
        let currentFolder = 'all';
        let folders = ['all', 'food', 'views', 'places'];
        let searchTimeout;
        let tempMarker = null;
        let currentView = 'spots';
        let currentLocationData = null;

        const pinCategories = {
            'visited': { color: '#1c1917' },
            'plan-to-visit': { color: '#78716c' }
        };

        // Switch between search and spots view
        function switchView(view) {
            currentView = view;

            if (view === 'search') {
                document.getElementById('searchViewTab').classList.add('active');
                document.getElementById('spotsViewTab').classList.remove('active');
                document.getElementById('searchView').style.display = 'block';
                document.getElementById('spotsView').style.display = 'none';
                document.getElementById('tabsSection').style.display = 'none';
                document.getElementById('locationsList').style.display = 'none';
                document.querySelector('.clear-btn').style.display = 'none';
            } else {
                document.getElementById('searchViewTab').classList.remove('active');
                document.getElementById('spotsViewTab').classList.add('active');
                document.getElementById('searchView').style.display = 'none';
                document.getElementById('spotsView').style.display = 'block';
                document.getElementById('tabsSection').style.display = 'block';
                document.getElementById('locationsList').style.display = 'block';
                document.querySelector('.clear-btn').style.display = 'block';
            }
        }

        // Search for places using Nominatim (OpenStreetMap)
        async function searchPlaces(query, resultsContainer) {
            if (!query || query.length < 3) {
                resultsContainer.classList.remove('active');
                return;
            }

            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
                const results = await response.json();
                displaySearchResults(results, resultsContainer);
            } catch (error) {
                console.error('Search error:', error);
            }
        }

        function displaySearchResults(results, container) {
            if (results.length === 0) {
                container.innerHTML = '<div class="place-result-item"><div class="place-result-name">no results found</div></div>';
                container.classList.add('active');
                return;
            }

            container.innerHTML = results.map(result => `
                <div class="place-result-item" data-lat="${result.lat}" data-lon="${result.lon}" data-name="${result.display_name}">
                    <div class="place-result-name">${result.name || 'Unnamed'}</div>
                    <div class="place-result-address">${result.display_name}</div>
                </div>
            `).join('');

            container.classList.add('active');

            // Add click listeners to results
            container.querySelectorAll('.place-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    handlePlaceSelection(item, container);
                });
            });
        }

        function handlePlaceSelection(item, container) {
            const lat = parseFloat(item.dataset.lat);
            const lon = parseFloat(item.dataset.lon);

            // Move map to location
            map.setView([lat, lon], 15);

            // Remove previous temp marker if exists
            if (tempMarker) {
                map.removeLayer(tempMarker);
            }

            // Add temporary marker (does NOT open modal)
            tempMarker = L.marker([lat, lon], {
                icon: createIcon('#a8a29e')
            }).addTo(map);

            // Clear search
            document.getElementById('placeSearchInput').value = '';
            container.classList.remove('active');

            // Stay on search view
        }

        // Initialize map
        function initMap() {
            map = L.map('map', {
                zoomControl: false
            }).setView([43.6532, -79.3832], 13);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(map);

            // Add zoom control to bottom right
            L.control.zoom({
                position: 'bottomright'
            }).addTo(map);

            setTimeout(() => {
                map.invalidateSize();
            }, 250);

            map.on('click', function (e) {
                currentMarker = {
                    lat: e.latlng.lat,
                    lng: e.latlng.lng,
                    category: activeCategory
                };
                openModal();
            });
        }

        function createIcon(color) {
            return L.divIcon({
                className: 'custom-pin',
                html: `<svg width="20" height="32" viewBox="0 0 100 100">
                    <path d="M50 0C30 0 12.5 17.5 12.5 37.5C12.5 62.5 50 100 50 100S87.5 62.5 87.5 37.5C87.5 17.5 70 0 50 0Z" 
                    fill="${color}"/>
                </svg>`,
                iconSize: [20, 32],
                iconAnchor: [10, 32]
            });
        }

        function setActiveCategory(category) {
            activeCategory = category;
            document.querySelectorAll('.pin-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.category === category);
            });
        }

        function switchFolder(folder) {
            currentFolder = folder;
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.folder === folder);
            });
            renderLocations();
        }

        function openModal() {
            document.getElementById('locationModal').classList.add('active');
            document.getElementById('locationName').value = '';
            document.getElementById('locationNotes').value = '';
            document.getElementById('imagePreview').style.display = 'none';
            document.getElementById('imageInput').value = '';
            selectedRating = 0;
            updateStars();
            updateFolderSelect();
        }

        function closeModal() {
            document.getElementById('locationModal').classList.remove('active');
            currentMarker = null;

            // Remove temp marker if user cancels
            if (tempMarker) {
                map.removeLayer(tempMarker);
                tempMarker = null;
            }
        }

        function openLocationDetails(locationData) {
            currentLocationData = locationData;

            document.getElementById('viewLocationName').textContent = locationData.name;
            document.getElementById('viewLocationRating').textContent =
                '★'.repeat(locationData.rating) + '☆'.repeat(5 - locationData.rating);

            if (locationData.notes) {
                document.getElementById('viewLocationNotes').textContent = locationData.notes;
                document.getElementById('viewLocationNotesGroup').style.display = 'block';
            } else {
                document.getElementById('viewLocationNotesGroup').style.display = 'none';
            }

            if (locationData.image) {
                document.getElementById('viewLocationImage').src = locationData.image;
                document.getElementById('viewLocationImageGroup').style.display = 'block';
            } else {
                document.getElementById('viewLocationImageGroup').style.display = 'none';
            }

            document.getElementById('viewLocationModal').classList.add('active');
        }

        function closeViewModal() {
            document.getElementById('viewLocationModal').classList.remove('active');
            currentLocationData = null;
        }

        function deleteCurrentLocation() {
            if (!currentLocationData) return;

            if (!confirm(`delete "${currentLocationData.name}"?`)) return;

            // Find and remove marker
            const index = markers.findIndex(m => m.data === currentLocationData);
            if (index !== -1) {
                map.removeLayer(markers[index].marker);
                markers.splice(index, 1);
                savePins();
                renderLocations();
            }

            closeViewModal();
        }

        function openNewFolderModal() {
            document.getElementById('newFolderModal').classList.add('active');
            document.getElementById('newFolderName').value = '';
        }

        function closeNewFolderModal() {
            document.getElementById('newFolderModal').classList.remove('active');
        }

        function updateStars() {
            document.querySelectorAll('.star').forEach((star, index) => {
                star.classList.toggle('active', index < selectedRating);
            });
        }

        function updateFolderSelect() {
            const select = document.getElementById('folderSelect');
            const customFolders = JSON.parse(localStorage.getItem('customFolders') || '{}');

            select.innerHTML = folders.filter(f => f !== 'all').map(folder => {
                const name = customFolders[folder]?.name || folder;
                return `<option value="${folder}">${name}</option>`;
            }).join('');
        }

        function createNewFolder() {
            const name = document.getElementById('newFolderName').value.trim().toLowerCase();

            if (!name) {
                alert('please enter a folder name');
                return;
            }

            const folderId = name.replace(/\s+/g, '-');

            if (folders.includes(folderId)) {
                alert('a folder with this name already exists');
                return;
            }

            folders.push(folderId);

            const customFolders = JSON.parse(localStorage.getItem('customFolders') || '{}');
            customFolders[folderId] = { name };
            localStorage.setItem('customFolders', JSON.stringify(customFolders));

            renderTabs();
            closeNewFolderModal();
        }

        function deleteFolder(folderId, event) {
            event.stopPropagation();

            if (['all', 'food', 'views', 'places'].includes(folderId)) {
                alert('cannot delete default folders');
                return;
            }

            if (!confirm(`delete folder "${folderId}"?`)) {
                return;
            }

            folders = folders.filter(f => f !== folderId);

            const customFolders = JSON.parse(localStorage.getItem('customFolders') || '{}');
            delete customFolders[folderId];
            localStorage.setItem('customFolders', JSON.stringify(customFolders));

            if (currentFolder === folderId) {
                switchFolder('all');
            }

            renderTabs();
        }

        function renderTabs() {
            const customFolders = JSON.parse(localStorage.getItem('customFolders') || '{}');
            const tabsHtml = folders.map(folder => {
                const name = customFolders[folder]?.name || folder;
                const isCustom = !['all', 'food', 'views', 'places'].includes(folder);
                const deleteBtn = isCustom ? `<span class="delete-tab" onclick="deleteFolder('${folder}', event)">×</span>` : '';

                return `<button class="tab ${folder === currentFolder ? 'active' : ''}" data-folder="${folder}">${name}${deleteBtn}</button>`;
            }).join('');

            document.getElementById('tabsContainer').innerHTML = tabsHtml + '<button class="add-tab-btn" id="addTabBtn">+</button>';

            // Re-attach event listeners
            document.querySelectorAll('.tab').forEach(tab => {
                tab.addEventListener('click', () => switchFolder(tab.dataset.folder));
            });
            document.getElementById('addTabBtn').addEventListener('click', openNewFolderModal);
        }

        function saveLocation() {
            const name = document.getElementById('locationName').value.trim();
            const notes = document.getElementById('locationNotes').value.trim();
            const folder = document.getElementById('folderSelect').value;
            const imagePreview = document.getElementById('imagePreview');
            const image = imagePreview.style.display !== 'none' ? imagePreview.src : null;

            if (!name) {
                alert('please enter a location name');
                return;
            }

            const location = {
                ...currentMarker,
                name,
                rating: selectedRating,
                notes,
                image,
                folder,
                timestamp: Date.now()
            };

            // Remove temp marker if exists
            if (tempMarker) {
                map.removeLayer(tempMarker);
                tempMarker = null;
            }

            const marker = L.marker([location.lat, location.lng], {
                icon: createIcon(pinCategories[location.category].color)
            }).addTo(map);

            // Add click listener to marker
            marker.on('click', function (e) {
                L.DomEvent.stopPropagation(e);
                openLocationDetails(location);
            });

            markers.push({ marker, data: location });
            savePins();
            renderLocations();
            closeModal();
        }

        function renderLocations() {
            const list = document.getElementById('locationsList');
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();

            const filteredMarkers = markers.filter(({ data }) => {
                const matchesSearch = data.name.toLowerCase().includes(searchTerm) ||
                    (data.notes && data.notes.toLowerCase().includes(searchTerm));
                const matchesFolder = currentFolder === 'all' || data.folder === currentFolder;
                return matchesSearch && matchesFolder;
            });

            if (filteredMarkers.length === 0) {
                list.innerHTML = `
                    <div class="empty-state">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                        <p>${markers.length === 0 ? 'click on the map to add a location' : 'no locations found'}</p>
                    </div>
                `;
                return;
            }

            list.innerHTML = filteredMarkers.map(({ data }) => {
                const index = markers.findIndex(m => m.data === data);
                return `
                    <div class="location-card" data-index="${index}">
                        <div class="location-header">
                            <div class="location-name">${data.name}</div>
                            <div class="rating">${'★'.repeat(data.rating)}${'☆'.repeat(5 - data.rating)}</div>
                        </div>
                        ${data.notes ? `<div class="location-notes">${data.notes}</div>` : ''}
                        ${data.image ? `<img src="${data.image}" class="location-image" alt="${data.name}">` : ''}
                    </div>
                `;
            }).join('');

            // Add click listeners
            document.querySelectorAll('.location-card').forEach(card => {
                card.addEventListener('click', () => {
                    const index = parseInt(card.dataset.index);
                    focusLocation(index);
                });
            });
        }

        function focusLocation(index) {
            const { marker } = markers[index];
            map.setView(marker.getLatLng(), 15);
        }

        function savePins() {
            const data = markers.map(({ data }) => data);
            localStorage.setItem('footprintLocations', JSON.stringify(data));
        }

        function loadFolders() {
            const customFolders = JSON.parse(localStorage.getItem('customFolders') || '{}');
            folders = ['all', 'food', 'views', 'places', ...Object.keys(customFolders)];
            renderTabs();
        }

        function loadPins() {
            const saved = localStorage.getItem('footprintLocations');
            if (saved) {
                const locations = JSON.parse(saved);
                locations.forEach(data => {
                    const marker = L.marker([data.lat, data.lng], {
                        icon: createIcon(pinCategories[data.category].color)
                    }).addTo(map);

                    // Add click listener to marker
                    marker.on('click', function (e) {
                        L.DomEvent.stopPropagation(e);
                        openLocationDetails(data);
                    });

                    markers.push({ marker, data });
                });
                renderLocations();
            }
        }

        function clearPins() {
            if (!confirm('clear all locations? this cannot be undone.')) return;
            markers.forEach(({ marker }) => map.removeLayer(marker));
            markers = [];
            localStorage.removeItem('footprintLocations');
            renderLocations();
        }

        // Event listeners
        document.addEventListener('DOMContentLoaded', function () {
            initMap();
            loadFolders();
            loadPins();

            // Pin category buttons
            document.querySelectorAll('.pin-btn').forEach(btn => {
                btn.addEventListener('click', () => setActiveCategory(btn.dataset.category));
            });

            // Search input
            document.getElementById('searchInput').addEventListener('keyup', renderLocations);

            // Star rating
            document.querySelectorAll('.star').forEach(star => {
                star.addEventListener('click', function () {
                    selectedRating = parseInt(this.dataset.rating);
                    updateStars();
                });
            });

            // Image upload
            document.getElementById('imageUpload').addEventListener('click', () => {
                document.getElementById('imageInput').click();
            });

            document.getElementById('imageInput').addEventListener('change', function (e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        const preview = document.getElementById('imagePreview');
                        preview.src = e.target.result;
                        preview.style.display = 'block';
                    };
                    reader.readAsDataURL(file);
                }
            });

            // Modal buttons
            document.getElementById('cancelBtn').addEventListener('click', closeModal);
            document.getElementById('saveBtn').addEventListener('click', saveLocation);
            document.getElementById('cancelFolderBtn').addEventListener('click', closeNewFolderModal);
            document.getElementById('createFolderBtn').addEventListener('click', createNewFolder);
            document.getElementById('clearBtn').addEventListener('click', clearPins);
            document.getElementById('closeViewBtn').addEventListener('click', closeViewModal);
            document.getElementById('deleteLocationBtn').addEventListener('click', deleteCurrentLocation);

            // Page title editing
            document.getElementById('pageTitle').addEventListener('blur', function () {
                localStorage.setItem('pageTitle', this.textContent);
            });

            // Load saved page title
            const savedTitle = localStorage.getItem('pageTitle');
            if (savedTitle) {
                document.getElementById('pageTitle').textContent = savedTitle;
            }

            // Place search in sidebar with debounce
            document.getElementById('placeSearchInput').addEventListener('input', function (e) {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    searchPlaces(e.target.value, document.getElementById('placeSearchResults'));
                }, 300);
            });

            // View toggle buttons
            document.getElementById('searchViewTab').addEventListener('click', () => switchView('search'));
            document.getElementById('spotsViewTab').addEventListener('click', () => switchView('spots'));

            // Close search results when clicking outside
            document.addEventListener('click', function (e) {
                const placeSearchBox = document.querySelector('.place-search-box');

                if (placeSearchBox && !placeSearchBox.contains(e.target)) {
                    document.getElementById('placeSearchResults').classList.remove('active');
                }
            });
        });