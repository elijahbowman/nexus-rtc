package com.nexusrtc.backend.controller;

import com.nexusrtc.backend.service.StorageFacade;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/attachments")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AttachmentController {

    private final StorageFacade storageFacade;

    public AttachmentController(StorageFacade storageFacade) {
        this.storageFacade = storageFacade;
    }

    /**
     * Uploads a file to object storage and returns its key and content type.
     * KNOWN ISSUE (S7): no content-type allowlist, no multipart size config (Spring's 1 MB default
     * applies), the client-supplied Content-Type is stored as-is, and the upload isn't recorded
     * against its owner. The 500 response also returns the raw exception message.
     */
    @PostMapping("/upload")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<?> uploadAttachment(@RequestParam("file") MultipartFile file) {
        try {
            // Store the file.
            String uniqueFileKey = storageFacade.uploadFile(file);

            // The frontend uses the content type to decide how to render the attachment.
            String contentType = file.getContentType();

            Map<String, String> response = new HashMap<>();
            response.put("attachmentPath", uniqueFileKey);
            response.put("attachmentType", contentType);

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("An unexpected error occurred during object processing: " + e.getMessage());
        }
    }
}